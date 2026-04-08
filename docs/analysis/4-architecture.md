# 4. 系统架构

## 应用入口

### 后端入口（`apps/api/src/main.ts`）

```
NestFactory.create(AppModule)
  ├── app.enableCors()                    # 启用跨域
  ├── app.setGlobalPrefix('api')          # 全局路由前缀 /api
  ├── app.useGlobalPipes(ValidationPipe)  # 全局参数验证（whitelist + transform）
  └── app.listen(PORT)                    # 默认端口 3000
```

### 前端入口（`apps/web/src/main.ts`）

```
createApp(App)
  ├── app.use(pinia)     # Pinia 状态管理
  ├── app.use(router)    # Vue Router
  └── app.mount('#app')  # 挂载到 DOM
```

### OCR 微服务入口（`apps/ocr-service/main.py`）

```
FastAPI()
  ├── GET /health     # 健康检查
  └── POST /ocr       # OCR 文字识别
```

---

## C4 容器图

```mermaid
C4Container
    title 族谱数字化系统（Zupu）— 容器图

    Person(user, "用户", "族谱管理者/协作者/查看者")

    System_Boundary(zupu, "Zupu 系统") {
        Container(web, "Vue 3 SPA", "Vite + Vue Router + Pinia + D3.js", "单页应用，提供成员管理、可视化、审批等 UI")
        Container(api, "NestJS API", "NestJS + Prisma + JWT", "REST API 服务端，处理业务逻辑和数据持久化")
        Container(ocr, "OCR 微服务", "FastAPI + PaddleOCR", "独立的 Python OCR 识别服务")
        Container(worker, "BullMQ Workers", "NestJS Providers", "异步任务处理：OCR/导出，内嵌于 API 进程")

        ContainerDb(pg, "PostgreSQL 16", "主数据库，存储所有业务数据")
        ContainerDb(redis, "Redis 7", "BullMQ 消息中间件")
        ContainerDb(minio, "MinIO", "对象存储：族谱源文件、导出 PDF")
    }

    Rel(user, web, "浏览器访问", "HTTP")
    Rel(web, api, "REST API 调用", "HTTP/JSON")
    Rel(api, pg, "数据读写", "Prisma Client")
    Rel(api, redis, "队列投递/消费", "BullMQ")
    Rel(api, minio, "文件存取", "MinIO SDK")
    Rel(worker, ocr, "调用 OCR", "HTTP POST")
    Rel(worker, redis, "消费任务", "BullMQ Worker")
```

---

## 后端模块依赖关系

```mermaid
graph TD
    subgraph AppModule["AppModule (根模块)"]
        direction TB
    end

    subgraph Infra["基础设施层"]
        PRISMA[PrismaModule]
        FAMILIES[FamiliesModule]
        QUEUE[QueueModule]
        STORAGE[StorageModule]
    end

    subgraph Business["业务模块层"]
        AUTH[AuthModule]
        MEMBERS[MembersModule]
        SEARCH[SearchModule]
        OCR_MOD[OcrModule]
        UPLOADS[UploadsModule]
        EXPORTS[ExportsModule]
        AUDITS[AuditsModule]
        ACCESS[AccessRequestsModule]
        EDIT[EditRequestsModule]
        NOTIFY[NotificationsModule]
        VIZ[VisualizationModule]
        HEALTH[HealthModule]
    end

    AppModule --> Infra
    AppModule --> Business

    %% 基础设施间依赖
    FAMILIES --> PRISMA

    %% 业务 → 基础设施依赖
    AUTH --> PRISMA
    MEMBERS --> PRISMA & FAMILIES & AUDITS
    SEARCH --> PRISMA & FAMILIES
    OCR_MOD --> PRISMA & FAMILIES & QUEUE & STORAGE & AUDITS
    UPLOADS --> PRISMA & FAMILIES & STORAGE
    EXPORTS --> PRISMA & FAMILIES & QUEUE & STORAGE
    AUDITS --> PRISMA & FAMILIES
    ACCESS --> PRISMA & FAMILIES & AUDITS
    EDIT --> PRISMA & AUDITS
    NOTIFY --> PRISMA
    VIZ --> PRISMA & FAMILIES
```

---

## RBAC 权限模型

### 权限继承等级

```mermaid
graph LR
    ADMIN["admin (100)"] --> CREATOR["creator (80)"]
    CREATOR --> COLLABORATOR["collaborator (60)"]
    COLLABORATOR --> VIEWER["viewer (20)"]

    style ADMIN fill:#e74c3c,color:white
    style CREATOR fill:#e67e22,color:white
    style COLLABORATOR fill:#3498db,color:white
    style VIEWER fill:#27ae60,color:white
```

### 权限校验流程

```mermaid
sequenceDiagram
    participant C as 客户端
    participant JG as JwtAuthGuard
    participant RG as RolesGuard
    participant API as Controller

    C->>JG: 请求 (Bearer Token)
    JG->>JG: 验证 JWT → 提取 user.sub
    JG-->>C: 401 Unauthorized (Token 无效)

    JG->>RG: user.sub + x-family-id
    RG->>RG: 查询 @Roles() 装饰器
    alt 无 @Roles 装饰器
        RG->>API: 放行
    else 有 @Roles 装饰器
        RG->>RG: 通过 x-family-id 查 Family
        RG->>RG: 查 FamilyUserRole 获取角色
        RG->>RG: ROLE_HIERARCHY 比较等级
        alt 权限足够
            RG->>API: 放行 (挂载 familyRole)
        else 权限不足
            RG-->>C: 403 Forbidden
        end
    end
```

### 各接口权限要求

| 模块 | 接口 | 最低权限 |
|------|------|---------|
| 成员管理 | 全部 CRUD | `JwtAuthGuard`（仅需登录） |
| 族谱管理 | 创建/探索/我的列表 | `JwtAuthGuard` |
| 族谱管理 | 修改公开程度/角色管理 | `admin` / `creator` |
| 加入申请 | 提交申请/我的申请 | `JwtAuthGuard` |
| 加入申请 | 查看/审批 | `admin` / `creator` / `collaborator` |
| 修改审批 | 提交修改 | `viewer`（注意：角色守卫实际继承，collaborator+ 可用） |
| 修改审批 | 查看/审批 | `admin` / `creator` |
| 可视化 | 树状图/吊线图 | `viewer`+ |
| 通知 | 全部接口 | `JwtAuthGuard` |

---

## 前端架构

```mermaid
graph TD
    subgraph UI["界面层"]
        PAGES[Pages]
        LAYOUT[Layout Components]
        UI_COMP[UI Components]
        VIZ_COMP[Viz Components]
    end

    subgraph State["状态层"]
        AUTH_STORE[Auth Store]
        MEMBERS_STORE[Members Store]
    end

    subgraph Service["通信层"]
        API_SVC[api.ts - axios 实例]
    end

    subgraph External["外部"]
        BACKEND[NestJS API]
        LS[localStorage]
    end

    PAGES --> LAYOUT & UI_COMP & VIZ_COMP
    PAGES --> State
    State --> API_SVC
    API_SVC -->|REST| BACKEND

    AUTH_STORE -->|token/user| LS
    API_SVC -->|拦截器自动注入| LS
```

### 前端认证机制

1. 登录成功后，`token` 和 `user` 对象存入 `localStorage`
2. axios 请求拦截器自动读取 `localStorage`，注入 `Authorization` 和 `x-family-id` 请求头
3. 路由守卫检查 `localStorage.token`，未登录时重定向到 `/login`
4. `App.vue` 挂载时调用 `loadUserInfo()` 刷新用户多族谱信息
