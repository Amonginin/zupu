# zupu

族谱数字化系统（MVP）代码仓库。

## 目录

- apps/api: NestJS API 服务
- apps/web: Vue3 前端
- apps/ocr-service: Python OCR 独立服务
- docs: 需求、选型、系统设计文档

## 快速开始

1. 启动基础依赖

```bash
docker compose up -d
```

2. 安装 Node 依赖

```bash
npm install
```

3. 分别启动 API 与 Web

```bash
npm run dev:api
npm run dev:web
```

4. OCR 服务（Python）

参考 apps/ocr-service/README.md。
