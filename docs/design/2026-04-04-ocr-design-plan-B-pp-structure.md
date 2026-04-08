# 方案 B 详细设计：PP-StructureV3 + PP-OCRv5 模块化管线方案

- 文档日期：2026-04-04
- 关联文档：[OCR 引擎技术选型报告](./2026-04-04-ocr-engine-tech-selection-report.md)
- 方案定位：**备选方案** — 模块化管线，版面分析 + 文字识别分离

---

## 1. 方案概述

### 1.1 核心思路

将 OCR 任务拆分为两个独立阶段：
1. **版面分析阶段**：使用 PP-StructureV3（内含 PP-DocLayoutV3）对族谱图片进行区域分割，定位姓名块、吊线区域、附注等元素，并输出带坐标的结构化结果。
2. **文字识别阶段**：使用 PP-OCRv5 对切分出的文字区域进行高精度识别，支持竖排、手写体、简繁混排。

两阶段的结果通过**坐标几何推算 + 自定义后处理逻辑**还原族谱的层级树结构。

### 1.2 管线架构

```
族谱图片输入
     │
     ▼
┌──────────────────────────────────┐
│  阶段一：PP-StructureV3          │
│  (版面分析 + 文档结构化)          │
│                                  │
│  PP-DocLayoutV3                  │
│  ├─ 实例分割（多边形定位）        │
│  ├─ 区域分类（文本/表格/图/标题） │
│  └─ 阅读顺序重建                 │
│                                  │
│  输出：Markdown + 区域坐标        │
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│  阶段二：PP-OCRv5                │
│  (高精度文字识别，可选)            │
│                                  │
│  ├─ 文本检测 (DB++)              │
│  ├─ 方向分类 (文本行/文档方向)    │
│  └─ 文本识别 (SVTR-LCNet)       │
│                                  │
│  输出：逐行文本 + 坐标 + 置信度   │
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│  阶段三：坐标后处理               │
│  (自定义族谱层级还原算法)         │
│                                  │
│  ├─ X/Y 坐标排序                 │
│  ├─ 连线检测推算父子关系          │
│  └─ 世代分层                     │
│                                  │
│  输出：结构化成员列表 + 关系       │
└──────────────────────────────────┘
```

---

## 2. 两种调用模式

根据用户提供的官方 API 示例代码，PP-StructureV3 和 PP-OCRv5 均支持**云端 API** 和 **本地推理**两种调用模式。

### 2.1 PP-StructureV3 调用

#### 云端异步 Job API（推荐）

```python
import json
import os
import requests
import time

JOB_URL = "https://paddleocr.aistudio-app.com/api/v2/ocr/jobs"
TOKEN = os.getenv("PADDLEOCR_TOKEN", "")
MODEL = "PP-StructureV3"

def call_structure_v3_async(file_url: str) -> dict:
    """通过云端异步 Job API 调用 PP-StructureV3"""
    headers = {
        "Authorization": f"bearer {TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "fileUrl": file_url,
        "model": MODEL,
        "optionalPayload": {
            "useDocOrientationClassify": True,   # 自动纠正拍照旋转
            "useDocUnwarping": True,             # 纸质弯曲矫正
            "useChartRecognition": False,         # 族谱无图表
        },
    }
    
    # 提交任务
    job_resp = requests.post(JOB_URL, json=payload, headers=headers)
    assert job_resp.status_code == 200
    job_id = job_resp.json()["data"]["jobId"]
    
    # 轮询结果
    while True:
        result_resp = requests.get(f"{JOB_URL}/{job_id}", headers=headers)
        state = result_resp.json()["data"]["state"]
        if state == "done":
            return result_resp.json()["data"]["resultUrl"]["jsonUrl"]
        elif state == "failed":
            raise Exception(result_resp.json()["data"]["errorMsg"])
        time.sleep(5)
```

#### 云端同步 API（低延迟，单页）

```python
import base64
import os
import requests

API_URL = "https://z1qd7bzbw4oaedq6.aistudio-app.com/layout-parsing"
TOKEN = os.getenv("PADDLEOCR_TOKEN", "")

def call_structure_v3_sync(file_path: str) -> dict:
    """通过云端同步 API 调用 PP-StructureV3（适合单页处理）"""
    with open(file_path, "rb") as f:
        file_data = base64.b64encode(f.read()).decode("ascii")

    headers = {
        "Authorization": f"token {TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "file": file_data,
        "fileType": 1,  # 0=PDF, 1=图片
        "useDocOrientationClassify": True,
        "useDocUnwarping": True,
        "useTextlineOrientation": True,
        "useChartRecognition": False,
    }

    resp = requests.post(API_URL, json=payload, headers=headers)
    assert resp.status_code == 200
    return resp.json()["result"]
```

#### 本地推理 API

```python
from paddleocr import PPStructure

engine = PPStructure(table=True, ocr=True, show_log=True)

def call_structure_v3_local(img_path: str) -> list:
    """本地推理调用 PP-StructureV3"""
    return engine(img_path)
```

### 2.2 PP-OCRv5 调用

#### 云端异步 Job API

```python
MODEL = "PP-OCRv5"

def call_ocrv5_async(file_url: str) -> dict:
    """通过云端异步 Job API 调用 PP-OCRv5"""
    headers = {
        "Authorization": f"bearer {TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "fileUrl": file_url,
        "model": MODEL,
        "optionalPayload": {
            "useDocOrientationClassify": True,
            "useDocUnwarping": True,
            "useTextlineOrientation": True,
        },
    }
    
    job_resp = requests.post(JOB_URL, json=payload, headers=headers)
    assert job_resp.status_code == 200
    job_id = job_resp.json()["data"]["jobId"]
    
    while True:
        result_resp = requests.get(f"{JOB_URL}/{job_id}", headers=headers)
        state = result_resp.json()["data"]["state"]
        if state == "done":
            return result_resp.json()["data"]["resultUrl"]["jsonUrl"]
        elif state == "failed":
            raise Exception(result_resp.json()["data"]["errorMsg"])
        time.sleep(5)
```

#### 云端同步 API（低延迟，单页）

```python
API_URL = "https://g6t7y14ba4g4s4pd.aistudio-app.com/ocr"

def call_ocrv5_sync(file_path: str) -> dict:
    """通过云端同步 API 调用 PP-OCRv5（适合单页处理）"""
    with open(file_path, "rb") as f:
        file_data = base64.b64encode(f.read()).decode("ascii")

    headers = {
        "Authorization": f"token {TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "file": file_data,
        "fileType": 1,
        "useDocOrientationClassify": True,
        "useDocUnwarping": True,
        "useTextlineOrientation": True,
    }

    resp = requests.post(API_URL, json=payload, headers=headers)
    assert resp.status_code == 200
    return resp.json()["result"]
```

---

## 3. 核心代码设计

### 3.1 改造后的 `main.py` 结构

```python
from fastapi import FastAPI
from pydantic import BaseModel
import base64
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
POLL_INTERVAL = 5
POLL_TIMEOUT = 300

# 调用策略：先用 StructureV3 做版面分析，再用 OCRv5 做精细识别
STRUCTURE_MODEL = "PP-StructureV3"
OCR_MODEL = "PP-OCRv5"

# 同步 API 端点（备用）
STRUCTURE_SYNC_URL = "https://z1qd7bzbw4oaedq6.aistudio-app.com/layout-parsing"
OCR_SYNC_URL = "https://g6t7y14ba4g4s4pd.aistudio-app.com/ocr"


class OcrRequest(BaseModel):
    source_key: str
    source_url: str | None = None


app = FastAPI(title="zupu-ocr-service")


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "zupu-ocr",
        "models": [STRUCTURE_MODEL, OCR_MODEL],
    }


@app.post("/ocr")
def run_ocr(req: OcrRequest):
    """
    双阶段管线：
    1. PP-StructureV3 版面分析 → 输出 Markdown + 区域坐标
    2. 若需要更精细的文字识别，可额外调用 PP-OCRv5
    """
    if not req.source_url:
        return _fallback_response(req.source_key, "未提供 source_url")

    try:
        # ── 阶段一：PP-StructureV3 版面分析 ──
        structure_result = _call_async_job(req.source_url, STRUCTURE_MODEL, {
            "useDocOrientationClassify": True,
            "useDocUnwarping": True,
            "useChartRecognition": False,
        })

        if not structure_result:
            return _fallback_response(req.source_key, "版面分析失败")

        # 解析版面分析结果
        layout_data = _parse_structure_result(structure_result)

        # ── 阶段二（可选）：PP-OCRv5 精细识别 ──
        # 如果 StructureV3 的 Markdown 输出质量已足够，可跳过此步
        # 当检测到版面分析输出中有大量低置信区域时，才触发 OCRv5
        ocr_result = None
        if _needs_fine_ocr(layout_data):
            ocr_result = _call_async_job(req.source_url, OCR_MODEL, {
                "useDocOrientationClassify": True,
                "useDocUnwarping": True,
                "useTextlineOrientation": True,
            })

        # ── 合并结果 ──
        candidates = _merge_results(layout_data, ocr_result)

        return {
            "source_key": req.source_key,
            "status": "succeeded",
            "candidates": candidates,
        }

    except Exception as e:
        return _fallback_response(req.source_key, str(e))


# ═══════════════════════════════════════════════════
# 云端 API 调用
# ═══════════════════════════════════════════════════
def _call_async_job(file_url: str, model: str, options: dict) -> str | None:
    """提交异步 Job 并轮询等待结果，返回 jsonl_url"""
    headers = {
        "Authorization": f"bearer {TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "fileUrl": file_url,
        "model": model,
        "optionalPayload": options,
    }

    job_resp = requests.post(JOB_URL, json=payload, headers=headers, timeout=30)
    if job_resp.status_code != 200:
        return None

    job_id = job_resp.json()["data"]["jobId"]

    elapsed = 0
    while elapsed < POLL_TIMEOUT:
        result_resp = requests.get(f"{JOB_URL}/{job_id}", headers=headers, timeout=15)
        if result_resp.status_code != 200:
            break

        state = result_resp.json()["data"]["state"]
        if state == "done":
            return result_resp.json()["data"]["resultUrl"]["jsonUrl"]
        elif state == "failed":
            return None

        time.sleep(POLL_INTERVAL)
        elapsed += POLL_INTERVAL

    return None


# ═══════════════════════════════════════════════════
# 结果解析
# ═══════════════════════════════════════════════════
def _parse_structure_result(jsonl_url: str) -> list[dict]:
    """解析 PP-StructureV3 返回的 JSONL 结果"""
    resp = requests.get(jsonl_url)
    resp.raise_for_status()

    pages = []
    for line in resp.text.strip().split("\n"):
        line = line.strip()
        if not line:
            continue

        result = json.loads(line)["result"]
        for layout_res in result.get("layoutParsingResults", []):
            pages.append({
                "markdown": layout_res.get("markdown", {}).get("text", ""),
                "images": layout_res.get("markdown", {}).get("images", {}),
                "outputImages": layout_res.get("outputImages", {}),
            })

    return pages


def _parse_ocr_result(jsonl_url: str) -> list[dict]:
    """解析 PP-OCRv5 返回的 JSONL 结果"""
    resp = requests.get(jsonl_url)
    resp.raise_for_status()

    pages = []
    for line in resp.text.strip().split("\n"):
        line = line.strip()
        if not line:
            continue

        result = json.loads(line)["result"]
        for ocr_res in result.get("ocrResults", []):
            pages.append({
                "prunedResult": ocr_res.get("prunedResult", ""),
                "ocrImage": ocr_res.get("ocrImage", ""),
            })

    return pages


def _needs_fine_ocr(layout_data: list[dict]) -> bool:
    """判断是否需要额外的 PP-OCRv5 精细识别"""
    # 简单策略：如果版面分析输出的 Markdown 文本过短，则触发精细识别
    total_text = "".join(p.get("markdown", "") for p in layout_data)
    return len(total_text.strip()) < 50  # 少于 50 字符认为版面分析提取不足


# ═══════════════════════════════════════════════════
# 结果合并与结构化
# ═══════════════════════════════════════════════════
def _merge_results(layout_data: list[dict], ocr_jsonl_url: str | None) -> list[dict]:
    """合并版面分析与 OCR 识别结果"""
    candidates = []

    # 版面分析结果（Markdown 格式）
    for i, page in enumerate(layout_data):
        candidates.append({
            "fieldName": "layout_markdown",
            "fieldValue": page["markdown"],
            "confidence": 0.90,
            "metadata": {
                "format": "markdown",
                "model": "PP-StructureV3",
                "page": i,
            },
        })

    # OCRv5 精细识别结果（如果有）
    if ocr_jsonl_url:
        ocr_pages = _parse_ocr_result(ocr_jsonl_url)
        for i, page in enumerate(ocr_pages):
            candidates.append({
                "fieldName": "ocr_text",
                "fieldValue": page["prunedResult"],
                "confidence": 0.85,
                "metadata": {
                    "format": "pruned_text",
                    "model": "PP-OCRv5",
                    "page": i,
                },
            })

    return candidates


# ═══════════════════════════════════════════════════
# 回退逻辑
# ═══════════════════════════════════════════════════
def _fallback_response(source_key: str, reason: str) -> dict:
    return {
        "source_key": source_key,
        "status": "fallback",
        "reason": reason,
        "candidates": [
            {"fieldName": "name", "fieldValue": "（OCR 未就绪）", "confidence": 0.0},
        ],
    }
```

---

## 4. 后处理：坐标几何推算族谱层级

### 4.1 核心算法思路

对于吊线族谱，版面分析可以检测到各人名的坐标位置。利用这些坐标信息可以还原层级关系：

```
Y 坐标轴（从上到下 = 从高辈到低辈）
     │
     │  ┌──始祖──┐          Y = 100
     │  │        │
     │  长子    次子         Y = 250
     │  │
     │  孙子                 Y = 400
     │
     └──────────────▶ X 坐标轴

规则：
1. Y 坐标相近的人物为同一世代
2. 同一世代中，X 坐标从左到右为长幼排序
3. 上方人物与下方人物之间通过竖线连接 → 父子关系
```

### 4.2 坐标层级还原算法

```python
from typing import List, Dict, Tuple
from dataclasses import dataclass
import re


@dataclass
class TextBlock:
    """从版面分析中提取的文本块"""
    text: str
    x: float           # 中心 X 坐标
    y: float           # 中心 Y 坐标
    width: float
    height: float
    confidence: float


def cluster_by_generation(blocks: List[TextBlock], y_threshold: float = 50) -> Dict[int, List[TextBlock]]:
    """
    按 Y 坐标聚类，划分世代。
    Y 坐标差距在 y_threshold 内的归为同一世代。
    """
    if not blocks:
        return {}

    # 按 Y 坐标排序
    sorted_blocks = sorted(blocks, key=lambda b: b.y)

    generations = {}
    gen_idx = 0
    current_y = sorted_blocks[0].y

    for block in sorted_blocks:
        if block.y - current_y > y_threshold:
            gen_idx += 1
            current_y = block.y

        if gen_idx not in generations:
            generations[gen_idx] = []
        generations[gen_idx].append(block)

    # 每个世代内按 X 坐标排序（左为长、右为幼）
    for gen in generations:
        generations[gen].sort(key=lambda b: b.x)

    return generations


def infer_parent_child(
    generations: Dict[int, List[TextBlock]],
    x_threshold: float = 100,
) -> List[Tuple[str, str]]:
    """
    推算父子关系。
    规则：子辈人物在 X 坐标上与父辈人物最近的，建立父子关系。
    """
    relations = []
    gen_keys = sorted(generations.keys())

    for i in range(len(gen_keys) - 1):
        parents = generations[gen_keys[i]]
        children = generations[gen_keys[i + 1]]

        for child in children:
            # 找到 X 坐标最近的父辈
            closest_parent = min(parents, key=lambda p: abs(p.x - child.x))
            if abs(closest_parent.x - child.x) < x_threshold:
                relations.append((closest_parent.text, child.text))

    return relations
```

### 4.3 示例场景

输入坐标数据：
```json
[
  {"text": "张大公", "x": 400, "y": 100},
  {"text": "张长子", "x": 300, "y": 250},
  {"text": "张次子", "x": 500, "y": 250},
  {"text": "张长孙", "x": 280, "y": 400},
  {"text": "张次孙", "x": 320, "y": 400}
]
```

输出关系推算：
```
世代 0: [张大公]
世代 1: [张长子, 张次子]
世代 2: [张长孙, 张次孙]

父子关系:
  张大公 → 张长子
  张大公 → 张次子
  张长子 → 张长孙
  张长子 → 张次孙
```

---

## 5. 可选参数对照表

### PP-StructureV3

| 参数 | 类型 | 默认值 | 说明 | 族谱场景建议 |
|---|---|---|---|---|
| `useDocOrientationClassify` | bool | False | 文档方向自动分类 | **True** |
| `useDocUnwarping` | bool | False | 弯曲矫正 | **True** |
| `useChartRecognition` | bool | False | 图表识别 | False |

### PP-OCRv5

| 参数 | 类型 | 默认值 | 说明 | 族谱场景建议 |
|---|---|---|---|---|
| `useDocOrientationClassify` | bool | False | 文档方向自动分类 | **True** |
| `useDocUnwarping` | bool | False | 弯曲矫正 | **True** |
| `useTextlineOrientation` | bool | False | 文本行方向分类（竖排检测） | **True** — 必开 |

---

## 6. 输出数据格式

### PP-StructureV3 输出（JSONL，每行一页）

```json
{
  "result": {
    "layoutParsingResults": [
      {
        "markdown": {
          "text": "第十世\n\n张三 配李氏\n张四 配王氏\n...",
          "images": {}
        },
        "outputImages": {
          "layout_result": "https://...版面分析可视化结果图...",
          "text_detection": "https://...文本检测结果图..."
        }
      }
    ]
  }
}
```

### PP-OCRv5 输出（JSONL，每行一页）

```json
{
  "result": {
    "ocrResults": [
      {
        "prunedResult": "张三 配李氏 1850-1920\n张四...",
        "ocrImage": "https://...识别结果可视化图..."
      }
    ]
  }
}
```

---

## 7. 部署方案

### 7.1 推荐方案：云端 API（零运维、无需 GPU）

```
┌────────────────────────────────────────────────────┐
│                    生产环境                         │
│                                                    │
│  Docker Compose                                    │
│  ┌─────────┐  ┌─────────┐  ┌───────────────────┐  │
│  │ web     │  │ api     │  │ ocr-service       │  │
│  │ (Vue 3) │  │ (NestJS)│  │ (FastAPI)         │  │
│  │         │  │         │  │                   │  │
│  │         │  │ 调用──────▶│ ①StructureV3 API  │  │
│  │         │  │         │  │ ②OCRv5 API (可选) │  │
│  └─────────┘  └─────────┘  └────────┬──────────┘  │
│                                     │             │
│                           ┌─────────▼──────────┐  │
│                           │  PaddleOCR 云平台    │  │
│                           │  Job API / Sync API │  │
│                           └────────────────────┘  │
└────────────────────────────────────────────────────┘
```

**环境变量配置** (`.env`)：
```env
PADDLEOCR_TOKEN=93a4e0e0e4d13c382b07df422174f491265112c6
OCR_SERVICE_URL=http://localhost:8000/ocr
```

### 7.2 备选方案：本地推理

```bash
pip install paddlepaddle paddleocr
```

本地模式无需 GPU 也可运行（CPU 模式速度较慢但可用），适合开发调试。

---

## 8. 与方案 A 的关键差异

| 维度 | 方案 A (VL-1.5) | 方案 B (StructureV3 + OCRv5) |
|---|---|---|
| **模型数量** | 1 个 | 2 个（可组合可独立） |
| **版面理解深度** | 语义级（理解含义） | 几何级（定位区域） |
| **层级还原** | 模型直接输出 | 需编写坐标推算算法 |
| **可微调性** | 困难（大模型） | 容易（各模块可独立微调） |
| **推理资源** | GPU 8GB+（本地） | CPU 可运行（本地） |
| **调试透明度** | 黑箱 | 白箱（可查看中间结果） |
| **后处理工作量** | 较少 | **较多（核心难点）** |
| **API 调用次数** | 1 次 | 1-2 次（可能翻倍） |

---

## 9. 风险与应对

| 风险 | 概率 | 影响 | 应对策略 |
|---|---|---|---|
| 坐标推算算法不够鲁棒 | 高 | 高 | 先针对 1-2 种常见版式开发，保留人工修正入口 |
| 两次 API 调用导致延迟翻倍 | 中 | 中 | 优先使用 StructureV3 的 Markdown 输出，仅在质量不足时触发 OCRv5 |
| PP-DocLayoutV3 将吊线误识别 | 中 | 中 | 通过 `outputImages` 检视版面分析可视化结果，辅助调试 |
| 竖排文本方向分类错误 | 低 | 中 | 开启 `useTextlineOrientation` 和 `useDocOrientationClassify` |

---

## 10. 实施计划

| 阶段 | 任务 | 耗时估计 |
|---|---|---|
| **验证阶段** | 用真实族谱分别调用 StructureV3 和 OCRv5，评估输出质量 | 0.5 天 |
| **管线搭建** | 改造 `main.py`，实现双阶段调用与结果合并 | 1 天 |
| **坐标算法** | 开发世代聚类 + 父子关系推算算法 | 2 天 |
| **前端适配** | 更新校对界面支持 Markdown + 坐标可视化 | 1 天 |
| **集成测试** | 端到端测试 + 不同族谱版式适配 | 1 天 |
| **合计** | | **5.5 天** |
