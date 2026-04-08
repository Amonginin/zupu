# 方案 A 详细设计：PaddleOCR-VL-1.5 端到端方案

- 文档日期：2026-04-04
- 关联文档：[OCR 引擎技术选型报告](./2026-04-04-ocr-engine-tech-selection-report.md)
- 方案定位：**推荐方案** — 多模态视觉语言模型，端到端文档理解

---

## 1. 方案概述

### 1.1 核心思路

使用 PaddleOCR-VL-1.5（0.9B 参数的多模态视觉语言模型）作为 OCR 引擎，直接将吊线族谱图片解析为结构化的 Markdown/JSON 输出。该模型具备版面理解、阅读顺序重建等端到端能力，无需手动编写复杂的坐标推算逻辑。

### 1.2 模型架构

```
┌─────────────────────────────────────────────────┐
│              PaddleOCR-VL-1.5 (0.9B)            │
│                                                 │
│  ┌──────────────┐    ┌───────────────────────┐  │
│  │  NaViT 视觉   │───▶│  ERNIE-4.5-0.3B 语言  │  │
│  │  编码器        │    │  模型                  │  │
│  │  (动态分辨率)   │    │  (语义理解+结构重建)    │  │
│  └──────────────┘    └───────────────────────┘  │
│                                                 │
│  输入：族谱图片    输出：Markdown / JSON          │
└─────────────────────────────────────────────────┘
```

**关键特性**：
- **动态高分辨率**：NaViT 风格编码器可处理任意尺寸输入图片
- **版面语义理解**：不仅识别文字，还理解版面结构与阅读顺序
- **多语言支持**：100+ 种语言，含简繁中文
- **结构化输出**：直接输出 Markdown（含层级标题）或 JSON

---

## 2. 系统架构设计

### 2.1 整体架构

```
用户上传族谱图片
        │
        ▼
┌──────────────┐     ┌─────────────────────────────┐
│  NestJS API  │────▶│     OCR Service (Python)     │
│  (apps/api)  │     │     (apps/ocr-service)       │
│              │◀────│                               │
│  POST /ocr   │     │  ┌─────────────────────────┐ │
│  任务管理     │     │  │ 调用模式（二选一）：       │ │
│              │     │  │  A. 云端 API（推荐）      │ │
│              │     │  │  B. 本地推理（备选）      │ │
│              │     │  └─────────────────────────┘ │
└──────────────┘     └─────────────────────────────┘
        │                        │
        ▼                        ▼
┌──────────────┐     ┌─────────────────────────────┐
│  PostgreSQL  │     │  输出：结构化 Markdown/JSON   │
│  OcrCandidate│     │  → 解析为成员列表 + 层级关系  │
└──────────────┘     └─────────────────────────────┘
```

### 2.2 调用模式

根据用户提供的官方 API 代码，PaddleOCR-VL-1.5 支持两种调用模式：

#### 模式 A：云端异步 Job API（推荐，无需 GPU）

- **API 端点**：`https://paddleocr.aistudio-app.com/api/v2/ocr/jobs`
- **认证方式**：`Authorization: bearer {TOKEN}`
- **调用流程**：提交任务 → 轮询状态 → 获取结果
- **优势**：无需本地 GPU，零运维

#### 模式 B：本地推理

- **调用方式**：`from paddleocr import PaddleOCRVL`
- **硬件需求**：GPU 8GB+ 显存（推荐）或 CPU（慢）
- **优势**：数据不出境、无网络依赖

---

## 3. 核心代码设计

### 3.1 改造后的 `main.py` 结构

```python
from fastapi import FastAPI
from pydantic import BaseModel
import json
import os
import requests
import tempfile
import time

# ═══════════════════════════════════════════════════
# 配置区
# ═══════════════════════════════════════════════════
JOB_URL = "https://paddleocr.aistudio-app.com/api/v2/ocr/jobs"
TOKEN = os.getenv("PADDLEOCR_TOKEN", "")
MODEL = "PaddleOCR-VL-1.5"
POLL_INTERVAL = 5       # 轮询间隔（秒）
POLL_TIMEOUT = 300      # 最大等待时间（秒）


class OcrRequest(BaseModel):
    source_key: str
    source_url: str | None = None


app = FastAPI(title="zupu-ocr-service")


# ═══════════════════════════════════════════════════
# 健康检查
# ═══════════════════════════════════════════════════
@app.get("/health")
def health():
    return {"status": "ok", "service": "zupu-ocr", "model": MODEL}


# ═══════════════════════════════════════════════════
# 核心 OCR 接口
# ═══════════════════════════════════════════════════
@app.post("/ocr")
def run_ocr(req: OcrRequest):
    """
    接收图片 URL，调用 PaddleOCR-VL-1.5 云端 API，
    返回结构化的版面解析结果（Markdown + 图片）。
    """
    if not req.source_url:
        return _fallback_response(req.source_key, "未提供 source_url")

    try:
        # ── 第一步：提交异步任务 ──
        headers = {"Authorization": f"bearer {TOKEN}"}
        optional_payload = {
            "useDocOrientationClassify": True,   # 族谱可能被旋转拍摄
            "useDocUnwarping": True,             # 纸质可能弯曲
            "useChartRecognition": False,
        }

        if req.source_url.startswith("http"):
            headers["Content-Type"] = "application/json"
            payload = {
                "fileUrl": req.source_url,
                "model": MODEL,
                "optionalPayload": optional_payload,
            }
            job_response = requests.post(JOB_URL, json=payload, headers=headers)
        else:
            # 本地文件模式（通过 MinIO presigned URL 通常不走这条路）
            return _fallback_response(req.source_key, "仅支持 URL 模式")

        if job_response.status_code != 200:
            return _fallback_response(
                req.source_key,
                f"任务提交失败: {job_response.status_code} {job_response.text}"
            )

        job_id = job_response.json()["data"]["jobId"]

        # ── 第二步：轮询等待结果 ──
        elapsed = 0
        while elapsed < POLL_TIMEOUT:
            result_resp = requests.get(f"{JOB_URL}/{job_id}", headers=headers)
            if result_resp.status_code != 200:
                break

            state = result_resp.json()["data"]["state"]

            if state == "done":
                jsonl_url = result_resp.json()["data"]["resultUrl"]["jsonUrl"]
                # ── 第三步：解析结果 ──
                return _parse_vl_result(req.source_key, jsonl_url)

            elif state == "failed":
                error_msg = result_resp.json()["data"].get("errorMsg", "未知错误")
                return _fallback_response(req.source_key, f"识别失败: {error_msg}")

            time.sleep(POLL_INTERVAL)
            elapsed += POLL_INTERVAL

        return _fallback_response(req.source_key, "识别超时")

    except Exception as e:
        return _fallback_response(req.source_key, str(e))


# ═══════════════════════════════════════════════════
# 结果解析
# ═══════════════════════════════════════════════════
def _parse_vl_result(source_key: str, jsonl_url: str) -> dict:
    """
    解析 PaddleOCR-VL-1.5 返回的 JSONL 结果。
    每一行代表一页的版面解析结果，包含 Markdown 文本和图片。
    """
    jsonl_resp = requests.get(jsonl_url)
    jsonl_resp.raise_for_status()

    lines = jsonl_resp.text.strip().split("\n")
    all_candidates = []

    for line in lines:
        line = line.strip()
        if not line:
            continue

        page_result = json.loads(line)["result"]

        for layout_res in page_result.get("layoutParsingResults", []):
            markdown_text = layout_res.get("markdown", {}).get("text", "")
            images = layout_res.get("markdown", {}).get("images", {})

            all_candidates.append({
                "fieldName": "layout_markdown",
                "fieldValue": markdown_text,
                "confidence": 0.95,
                "metadata": {
                    "format": "markdown",
                    "model": "PaddleOCR-VL-1.5",
                    "imageCount": len(images),
                },
            })

    return {
        "source_key": source_key,
        "status": "succeeded",
        "candidates": all_candidates,
    }


# ═══════════════════════════════════════════════════
# 回退逻辑
# ═══════════════════════════════════════════════════
def _fallback_response(source_key: str, reason: str) -> dict:
    """当真实 OCR 不可用时返回占位结果"""
    return {
        "source_key": source_key,
        "status": "fallback",
        "reason": reason,
        "candidates": [
            {"fieldName": "name", "fieldValue": "（OCR 未就绪）", "confidence": 0.0},
        ],
    }
```

### 3.2 可选参数说明

PaddleOCR-VL-1.5 云端 API 支持以下可选配置：

| 参数 | 类型 | 默认值 | 说明 | 族谱场景建议 |
|---|---|---|---|---|
| `useDocOrientationClassify` | bool | False | 文档方向自动分类与纠正 | **True** — 手机拍照可能旋转 |
| `useDocUnwarping` | bool | False | 文档弯曲矫正 | **True** — 纸质可能有折痕 |
| `useChartRecognition` | bool | False | 图表识别 | False — 族谱无图表 |

### 3.3 输出数据格式

PaddleOCR-VL-1.5 返回的核心数据结构（JSONL 格式，每行一页）：

```json
{
  "result": {
    "layoutParsingResults": [
      {
        "markdown": {
          "text": "## 第十世\n\n张三（1850-1920）配李氏\n├── 张四（1875-1940）\n├── 张五（1878-1950）\n...",
          "images": {
            "img_0.jpg": "https://...下载链接..."
          }
        },
        "outputImages": {
          "layout_result": "https://...版面分析可视化图..."
        }
      }
    ]
  }
}
```

---

## 4. 后处理：从 Markdown 到结构化族谱数据

### 4.1 解析管线

```
VL-1.5 Markdown 输出
        │
        ▼
┌──────────────────┐
│  Markdown 解析器  │  提取标题（世代）、段落（人物）
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  族谱结构提取器    │  正则/NLP 提取姓名、生卒年、配偶等
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  OcrCandidate 映射│  转换为系统 OcrCandidate 记录
└────────┬─────────┘
         │
         ▼
  人工校对界面 (OcrPage)
```

### 4.2 结构提取示例代码

```python
import re
from typing import List, Dict


def parse_genealogy_markdown(markdown_text: str) -> List[Dict]:
    """
    从 VL-1.5 输出的 Markdown 中提取族谱成员信息。
    
    预期的 Markdown 格式示例：
    ## 第十世
    张三（1850-1920）配李氏
    ├── 张四（1875-1940）配王氏
    └── 张五（1878-1950）

    返回结构化成员列表。
    """
    members = []
    current_generation = None

    # 按行解析
    for line in markdown_text.split("\n"):
        line = line.strip()
        if not line:
            continue

        # 提取世代标题
        gen_match = re.match(r"^#{1,3}\s*第?(\S+)世", line)
        if gen_match:
            current_generation = gen_match.group(1)
            continue

        # 提取人物信息
        # 模式：姓名（生年-卒年）配XXX
        person_match = re.match(
            r"[├└│─\s]*"                       # 树形符号
            r"([^\s（(]+)"                       # 姓名
            r"[（(]?(\d{4})?[—\-]?(\d{4})?[）)]?" # 生卒年（可选）
            r"(?:配|娶)?(\S+)?",                  # 配偶（可选）
            line
        )
        if person_match:
            name = person_match.group(1)
            birth_year = person_match.group(2)
            death_year = person_match.group(3)
            spouse = person_match.group(4)

            members.append({
                "fieldName": "member",
                "name": name,
                "generation": current_generation,
                "birthYear": birth_year,
                "deathYear": death_year,
                "spouse": spouse,
                "confidence": 0.90,
            })

    return members
```

---

## 5. 部署方案

### 5.1 推荐方案：云端 API（零运维）

```
┌──────────────────────────────────────────────────┐
│                   生产环境                        │
│                                                  │
│  Docker Compose                                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ web      │  │ api      │  │ ocr-service   │  │
│  │ (Vue 3)  │  │ (NestJS) │  │ (FastAPI)     │  │
│  │          │  │          │  │               │  │
│  │          │  │  调用───────▶│  调用云端 API  │  │
│  └──────────┘  └──────────┘  └───────┬───────┘  │
│                                      │          │
│                                      ▼          │
│                              ┌──────────────┐   │
│                              │ PaddleOCR    │   │
│                              │ 云平台 API   │   │
│                              │ (aistudio)   │   │
│                              └──────────────┘   │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ postgres │  │ redis    │  │ minio        │  │
│  └──────────┘  └──────────┘  └──────────────┘  │
└──────────────────────────────────────────────────┘
```

**环境变量配置** (`.env`)：
```env
# OCR 服务配置
PADDLEOCR_TOKEN=93a4e0e0e4d13c382b07df422174f491265112c6
PADDLEOCR_MODEL=PaddleOCR-VL-1.5
OCR_SERVICE_URL=http://localhost:8000/ocr
```

**Docker 配置** (`docker-compose.yml` 新增)：
```yaml
  ocr-service:
    build: ./apps/ocr-service
    ports:
      - "8000:8000"
    environment:
      - PADDLEOCR_TOKEN=${PADDLEOCR_TOKEN}
    # 云端 API 模式无需 GPU
```

### 5.2 备选方案：本地推理

若需要数据不出境或离线使用，可切换为本地推理模式：

```python
# 本地推理模式（需要 GPU 8GB+）
from paddleocr import PaddleOCRVL

pipeline = PaddleOCRVL()
output = pipeline.predict("path/to/genealogy.jpg")

for res in output:
    res.save_to_json(save_path="output")
    res.save_to_markdown(save_path="output")
```

**本地部署要求**：
- PaddlePaddle >= 3.2.1
- GPU 显存 >= 8GB（推荐 NVIDIA T4/A10）
- 首次运行自动下载模型（约数百 MB）

---

## 6. 与现有系统的集成点

### 6.1 后端 API 改动

需要在 `apps/api` 的 OCR 模块中更新调用逻辑：

| 现有接口 | 改动说明 |
|---|---|
| `POST /ocr/tasks` | 无需改动，仍创建 OCR 任务 |
| OCR 任务处理函数 | 更新 `source_url` 传递方式，确保传入 MinIO presigned URL |
| `OcrCandidate` 存储 | 新增 `layout_markdown` 类型的候选字段 |

### 6.2 前端校对界面改动

| 现有页面 | 改动说明 |
|---|---|
| `OcrPage` | 需要支持展示 Markdown 格式的识别结果 |
| 校对交互 | 从单个 `raw_text` 改为按成员逐条校对（姓名/世代/生卒年） |

### 6.3 数据库 Schema 扩展

```prisma
// OcrCandidate 新增字段（建议）
model OcrCandidate {
  // ... 现有字段 ...
  resultFormat  String?   // "raw_text" | "layout_markdown" | "structured"
  markdownText  String?   // VL-1.5 输出的原始 Markdown
  parsedMembers Json?     // 解析后的结构化成员列表
}
```

---

## 7. 风险与应对

| 风险 | 概率 | 影响 | 应对策略 |
|---|---|---|---|
| VL-1.5 无法理解吊线结构 | 中 | 高 | 先用 3-5 张真实族谱做 Smoke Test；可切换到方案 B |
| 云端 API Token 过期或限流 | 低 | 中 | 设置 Token 刷新机制；保留本地推理作为降级 |
| Markdown 解析正则不准确 | 高 | 中 | 保留原始 Markdown 在数据库中，前端支持人工修正 |
| 网络延迟导致异步任务等待过长 | 低 | 低 | 轮询超时后返回 fallback，支持手动重试 |

---

## 8. 实施计划

| 阶段 | 任务 | 耗时估计 |
|---|---|---|
| **验证阶段** | 用真实族谱图片调用云端 API，评估输出质量 | 0.5 天 |
| **核心改造** | 改造 `apps/ocr-service/main.py`，集成云端 API | 1 天 |
| **后处理开发** | 开发 Markdown → 结构化成员的解析逻辑 | 1 天 |
| **前端适配** | 更新校对界面支持新的数据格式 | 1 天 |
| **集成测试** | 端到端测试：上传 → 识别 → 校对 → 入库 | 0.5 天 |
| **合计** | | **4 天** |
