# 运行方式与集成测试指南

## 1. 文档目的

本文档用于说明本项目当前有哪些运行方式、每种方式需要什么环境，以及在 Windows 11 和 Linux 云服务器上应如何启动。它也会给出一条适合集成测试的推荐启动顺序，方便在本地联调或在服务器上验证整条业务链路。

## 2. 项目整体运行方式概览

本仓库是一个 Monorepo，当前包含 3 个应用：

- apps/api：NestJS API
- apps/web：Vue 3 前端
- apps/ocr-service：独立 Python OCR 服务

同时还依赖一组基础设施服务：

- PostgreSQL：数据库
- Redis：队列与 Worker 依赖
- MinIO：对象存储

### 运行模式一览

| 运行方式 | 适用场景 | 需要的环境 |
| --- | --- | --- |
| 基础设施容器 | 启动数据库、Redis、MinIO | Docker / Docker Compose |
| API 本地开发 | 联调后端接口、业务逻辑、Worker | Node.js、npm、PostgreSQL、Redis、MinIO |
| Web 本地开发 | 联调前端页面 | Node.js、npm、API 服务 |
| OCR 服务独立运行 | 验证 OCR 链路 | Python、pip、OCR 相关依赖 |
| 完整本地联调 | 端到端集成测试 | 上述全部环境 |
| Linux 云服务器运行 | 远程复现、接口验证、准生产联调 | Docker、Node.js、Python、可访问的端口 |

## 3. 各运行方式的说明

### 3.1 基础设施容器

根目录的 docker-compose.yml 定义了三个基础服务：

- PostgreSQL 16：5432
- Redis 7：6379
- MinIO：9000、9001

启动命令：

```bash
docker compose up -d
```

这一步通常是启动 API 和 OCR 之前的前置条件。API 的 Prisma 连接数据库，Queue/Worker 依赖 Redis，文件上传与 OCR 链路会依赖 MinIO 或本地存储。

### 3.2 API 服务

API 位于 apps/api，技术栈是 NestJS + Prisma + BullMQ。

默认启动方式：

```bash
npm run dev:api
```

API 默认监听：

- http://localhost:3000/api

健康检查：

- GET /api/health

关键环境变量：

- PORT：API 端口，默认 3000
- DATABASE_URL：Prisma 数据库连接串，必须可用
- REDIS_HOST：默认 127.0.0.1
- REDIS_PORT：默认 6379
- JWT_SECRET：默认 zupu-dev-secret
- OCR_SERVICE_URL：默认 http://localhost:8000
- MINIO_ENDPOINT：默认 localhost
- MINIO_PORT：默认 9000
- MINIO_ACCESS_KEY：默认 minioadmin
- MINIO_SECRET_KEY：默认 minioadmin
- MINIO_BUCKET：默认 zupu-source
- USE_LOCAL_STORAGE：设为 true 时使用本地文件存储
- LOCAL_STORAGE_PATH：本地存储路径，默认 ./storage

说明：

- Prisma 读取 DATABASE_URL，因此数据库必须先启动并完成迁移或推送 schema。
- Queue 与 Worker 会连接 Redis。
- OCR 任务会调用独立 OCR 服务。
- 如果未安装 MinIO 或调试阶段不想依赖对象存储，可启用 USE_LOCAL_STORAGE=true 走本地文件存储。

### 3.3 Web 前端

前端位于 apps/web，技术栈是 Vue 3 + Vite + Pinia。

默认启动方式：

```bash
npm run dev:web
```

默认地址：

- http://localhost:5173

构建与预览：

```bash
npm run build:web
cd apps/web
npm run preview
```

注意：当前前端请求地址写死为 http://localhost:3000/api。这个配置在本机联调时没有问题，但如果你把前端部署到 Linux 云服务器并在自己的电脑浏览器里访问，浏览器里的 localhost 会指向你自己的电脑，而不是服务器，因此需要：

- 修改 apps/web/src/services/api.ts 中的 baseURL
- 或者给 API 配反向代理
- 或者使用同机访问 / SSH 隧道做验证

### 3.4 OCR 服务

OCR 服务位于 apps/ocr-service，是一个独立的 Python/FastAPI 服务。

Windows 11 启动方式（venv 方案）：

```bash
cd apps/ocr-service
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Windows 11 启动方式（conda 方案）：

```bash
cd apps/ocr-service
conda create -n zupu-ocr python=3.11 -y
conda activate zupu-ocr
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

如果你本机日常使用的是 conda，优先建议使用这套方案，因为它和你的现有 Python 环境管理方式一致，也更方便后续安装 OCR 相关依赖。

Linux 启动方式：

```bash
cd apps/ocr-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

健康检查：

- GET /health

OCR 接口：

- POST /ocr

说明：

- 该服务在 PaddleOCR 可用时会尝试执行真实识别。
- 如果 PaddleOCR 不可用，当前实现会返回占位结果，以保证链路不中断。
- 如果要从远程机器访问 Linux 云服务器上的 OCR 服务，建议绑定 0.0.0.0，并开放防火墙端口。

## 4. 推荐的集成测试启动顺序

如果你的目标是做完整的集成测试，建议按下面顺序启动：

1. 启动基础设施

```bash
docker compose up -d
```

2. 准备数据库

- 确认 PostgreSQL 已可连接
- 配置 DATABASE_URL
- 执行 Prisma 迁移或 push

常用命令：

```bash
npm --workspace apps/api run prisma:generate
npm --workspace apps/api run prisma:migrate
```

如果只是快速联调，也可以根据实际情况使用：

```bash
npm --workspace apps/api run prisma:push
```

3. 启动 OCR 服务

- 如果本次测试涉及 OCR 上传、识别、校对流程，必须先启动 OCR 服务

4. 启动 API 服务

```bash
npm run dev:api
```

5. 启动 Web 前端

```bash
npm run dev:web
```

6. 进行端到端验证

建议至少覆盖以下流程：

- 登录 / 注册
- 成员新增、查询、删除
- 文件上传
- OCR 任务创建、轮询、校对
- 导出任务创建与结果查看
- 审计日志查询

## 5. Windows 11 环境建议

### 推荐环境

- Node.js：建议使用当前 LTS 版本
- npm：与 Node.js 配套即可
- Docker Desktop：用于启动 PostgreSQL、Redis、MinIO
- Python 3：用于 OCR 服务

### 没有 Docker 是否还能运行

可以，但取决于你是否有其他方式提供基础设施：

- API 仍然需要 PostgreSQL，Prisma 的 datasource 直接依赖 `DATABASE_URL`
- API 的队列、Worker 仍然需要 Redis
- MinIO 不是绝对必须，API 支持本地存储模式，可通过 `USE_LOCAL_STORAGE=true` 绕过 MinIO
- OCR 服务是独立进程，不依赖 Docker，本地用 Python 虚拟环境即可

也就是说：

- 只有前端：可以运行
- 前端 + API：可以运行，但必须有可用的 PostgreSQL 和 Redis
- 前端 + API + OCR：可以运行，但还要有可用的数据库、Redis，以及 OCR 服务地址

如果本机没有 Docker，常见替代方案有两个：

1. 在 Windows 上直接安装 PostgreSQL 和 Redis，然后把 `DATABASE_URL`、`REDIS_HOST`、`REDIS_PORT` 指向本机服务
2. 把数据库和 Redis 放到 Linux 云服务器上，本机只跑前端、API 或 OCR，靠网络连接远程服务

### 你的场景：Windows 11 已安装 PostgreSQL 和 Redis

你可以直接走“本地无 Docker 联调”方案，推荐顺序如下：

1. 确认 PostgreSQL 和 Redis 服务已启动
2. 为 API 准备环境变量，至少包括：
	- `DATABASE_URL`：指向本机 PostgreSQL
	- `REDIS_HOST=127.0.0.1`
	- `REDIS_PORT=6379`
	- `USE_LOCAL_STORAGE=true`：先绕过 MinIO
	- `LOCAL_STORAGE_PATH=./storage`：本地文件存储目录
	- `OCR_SERVICE_URL=http://localhost:8000`：如果要跑 OCR
3. 执行 Prisma 初始化

```bash
cd apps/api
npm run prisma:generate
npm run prisma:migrate
```

4. 启动 OCR 服务（如果要测 OCR 流程）

```bash
cd apps/ocr-service
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

5. 启动 API

```bash
cd apps/api
npm run start:dev
```

6. 启动前端

```bash
cd apps/web
npm run dev
```

### 无 Docker 模式下的最小可用组合

- 只验证前端页面：Web + API
- 验证上传和成员数据：Web + API + PostgreSQL + Redis
- 验证 OCR 链路：再加 OCR 服务

### 无 Docker 模式下最容易踩的坑

- `DATABASE_URL` 没配对，Prisma 会直接连不上数据库
- Redis 没启动，队列和 Worker 不会正常工作
- 前端仍然默认请求 `http://localhost:3000/api`
- 如果不启用 `USE_LOCAL_STORAGE=true`，API 会尝试走 MinIO

### 常见注意点

1. PowerShell 可能阻止虚拟环境激活脚本

如果执行 Activate.ps1 受限，可以先在当前窗口临时放开执行策略：

```bash
Set-ExecutionPolicy -Scope Process RemoteSigned
```

2. OCR 服务建议单独建虚拟环境

不要和前端、后端的 Node 环境混用。

3. 如果本地端口被占用

- API 默认 3000
- Web 默认 5173
- OCR 默认 8000
- PostgreSQL 默认 5432
- Redis 默认 6379
- MinIO 默认 9000/9001

## 6. Linux 云服务器环境建议

Linux 云服务器更适合做完整链路复现或准生产联调。

### 推荐做法

- 使用 Docker Compose 启动 PostgreSQL、Redis、MinIO
- 使用 Node.js 启动 API 和 Web
- 使用 Python 虚拟环境启动 OCR 服务

### 部署注意点

1. 端口放行

至少确保以下端口可达：

- 3000：API
- 5173：Web 开发模式
- 8000：OCR 服务
- 5432：PostgreSQL，通常不建议公网暴露
- 6379：Redis，通常不建议公网暴露
- 9000/9001：MinIO，按需暴露或仅内网访问

2. 前端 API 地址问题

Linux 服务器上运行前端时，前端页面里使用的 API 地址不要依赖浏览器本机 localhost。最稳妥的方式是：

- 改成服务器真实地址
- 或通过 Nginx / 反向代理统一转发

3. 对象存储模式

如果暂时不想部署 MinIO，也可以让 API 使用本地存储模式，但要保证文件路径可写。

4. OCR 服务外网访问

如果 API 和 OCR 不在同一台机器上，需要把 OCR_SERVICE_URL 指向可访问地址。

## 7. 建议的最小联调组合

如果你只是想尽快做集成测试，最小可用组合建议是：

- PostgreSQL
- Redis
- MinIO 或本地存储模式
- API
- OCR 服务
- Web

如果暂时不测试 OCR / 导出链路，可以先不启动 OCR 服务，但相关功能会不可用或只走占位逻辑。

## 8. 快速检查清单

启动完成后，建议逐项检查：

- API 健康检查返回正常
- OCR 健康检查返回正常
- Web 页面能打开
- 数据库连接正常，迁移已完成
- Redis 连接正常，队列能创建任务
- 上传文件后对象存储可写
- OCR 任务能从 pending 变为 succeeded 或 reviewed

## 9. 结论

当前项目最核心的运行方式是：Docker Compose 提供基础设施，Node.js 启动 API 与 Web，Python 独立启动 OCR 服务。对于 Windows 11，本地联调最方便；对于 Linux 云服务器，更适合做完整链路验证或对外访问测试，但要特别注意前端 API 地址写死为 localhost 这一点。
