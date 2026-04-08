# 6. 关键执行流程 (Execution Paths)

本节分析了 Zupu 核心业务的几个关键执行路径。

## 1. 协作者修改审批流 (Edit Request Flow)

这是 v0.2 版本引入的核心协作机制。保证了非创建者只能提交修改意向，由管理员审批后才实际生效。

```mermaid
sequenceDiagram
    participant Viewer as 协作者 (Viewer/Collaborator)
    participant API as API (EditRequests)
    participant DB as Database
    participant Admin as 创建者 (Creator/Admin)

    Viewer->>API: POST /edit-requests (editType, payload)
    API->>DB: 创建 EditRequest (status='pending')
    API->>DB: 创建 Notification (致 Admin)
    API-->>Viewer: 返回 Request ID

    Admin->>API: GET /notifications / GET /edit-requests
    API-->>Admin: 返回待审批列表

    alt 审核通过
        Admin->>API: POST /edit-requests/:id/approve
        API->>DB: 校验状态，解析 JSON Payload
        API->>DB: 执行实际修改 (如 member.create)
        API->>DB: 更新 EditRequest 状态为 'approved'
        API->>DB: 记录 AuditLog
        API->>DB: 创建 Notification (致 Viewer)
    else 要求修改
        Admin->>API: POST /edit-requests/:id/revision
        API->>DB: 更新 EditRequest 状态为 'revision_needed'
        API->>DB: 创建 Notification (致 Viewer)
    else 拒绝
        Admin->>API: POST /edit-requests/:id/reject
        API->>DB: 更新 EditRequest 状态为 'rejected'
        API->>DB: 记录 AuditLog
        API->>DB: 创建 Notification (致 Viewer)
    end
```

## 2. OCR 异步识别流 (OCR Processing Flow)

该流程展示了如何利用 Redis 队列解决耗时的深度学习 OCR 推理过程，保证 API 响应不被阻塞。

```mermaid
sequenceDiagram
    participant Web as 前端 (Vue)
    participant API as 后端 API
    participant Storage as MinIO 对象存储
    participant Queue as Redis (BullMQ)
    participant Worker as OCR Worker
    participant Python as OCR 微服务

    Web->>API: 1. 上传图像 (/uploads/source)
    API->>Storage: 存储文件
    API-->>Web: 返回 SourceDocument ID

    Web->>API: 2. 创建 OCR 任务 (/ocr/tasks)
    API->>DB: 创建 OcrTask (status: 'pending')
    API->>Queue: 投递任务 'run-ocr' (含 taskId)
    API-->>Web: 返回 taskId (前端开始轮询查状态)

    Queue-->>Worker: 接收到任务
    Worker->>DB: 更新状态为 'running'
    Worker->>Storage: 获取预签名临时下载 URL(Presigned URL)
    Worker->>Python: POST /ocr {source_url}
    
    Python->>Storage: 下载图像
    Python->>Python: PaddleOCR 推理识别
    Python-->>Worker: 返回 candidates 数组 (文本+置信度)
    
    alt 成功
        Worker->>DB: 保存 OcrCandidate
        Worker->>DB: 更新状态为 'succeeded'
    else 失败
        Worker->>DB: 更新状态为 'failed'并记录 errorMessage
    end

    Web->>API: 3. 轮询状态，发现 succeeded，获取 candidates
    Web->>API: 4. 人工校对提交 (/ocr/tasks/:id/review)
    API->>DB: 批量创建 Member + 记录 AuditLog
    API->>DB: 更新状态为 'reviewed'
```

## 3. OCR 任务状态转移机 (State Machine)

```mermaid
stateDiagram-v2
    [*] --> pending : 创建任务
    pending --> running : Worker 取出并执行
    running --> succeeded : OCR 微服务返回结果
    running --> failed : HTTP 错误或识别异常
    failed --> pending : (可选的重试逻辑, Queue层实现)
    succeeded --> reviewed : 用户完成人工校对
    reviewed --> [*]
```
