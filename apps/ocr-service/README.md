# OCR Service

独立OCR服务（Python/FastAPI）占位实现。

## 运行

```bash
cd apps/ocr-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## 接口

- GET /health
- POST /ocr
  - body: { "source_key": "uploads/sample.jpg" }
