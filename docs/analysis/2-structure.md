# 2. 项目目录结构

## Monorepo 根目录

```
zupu/
├── .git/                          # Git 版本控制
├── .gitignore                     # 忽略规则
├── README.md                      # 项目说明
├── docker-compose.yml             # 基础设施：PostgreSQL + Redis + MinIO
├── package.json                   # Monorepo 根配置（npm workspaces）
├── package-lock.json              # 依赖锁定
├── node_modules/                  # 共享依赖
└── apps/                          # 应用程序目录
    ├── api/                       # NestJS 后端服务
    ├── web/                       # Vue 3 前端
    └── ocr-service/               # Python OCR 微服务
```

## 后端 API 服务（apps/api）

```
apps/api/
├── .env                           # 环境变量（不入库）
├── .env.example                   # 环境变量模板
├── package.json                   # 后端依赖与脚本
├── nest-cli.json                  # NestJS CLI 配置
├── tsconfig.json                  # TypeScript 配置
├── prisma/                        # 数据库层
│   ├── schema.prisma              # Prisma 数据模型定义（核心！）
│   └── migrations/                # 数据库迁移文件
│       └── 20260403050343_zupu/   # 初始迁移
└── src/
    ├── main.ts                    # 应用入口（启动、CORS、全局管道）
    ├── app.module.ts              # 根模块（注册所有子模块）
    ├── common/                    # 通用工具
    │   ├── types.ts               # 角色类型定义 + 权限等级表
    │   ├── guards/
    │   │   └── roles.guard.ts     # RBAC 角色权限守卫
    │   └── decorators/
    │       └── roles.decorator.ts # @Roles() 装饰器
    ├── infra/                     # 基础设施层
    │   ├── prisma/                # Prisma 服务（全局单例）
    │   │   ├── prisma.module.ts
    │   │   └── prisma.service.ts
    │   ├── families/              # 族谱管理（核心基础设施）
    │   │   ├── families.module.ts
    │   │   ├── families.controller.ts  # 族谱 CRUD + 角色管理
    │   │   └── families.service.ts     # 族谱解析、创建、角色分配
    │   ├── queue/                 # BullMQ 任务队列
    │   │   ├── queue.module.ts
    │   │   └── queue.service.ts   # OCR / 导出两个队列
    │   └── storage/               # 对象存储（MinIO / 本地回退）
    │       ├── storage.module.ts
    │       └── storage.service.ts
    └── modules/                   # 业务模块
        ├── auth/                  # 认证模块
        │   ├── auth.module.ts
        │   ├── auth.controller.ts # 登录/注册/获取当前用户
        │   ├── auth.service.ts    # 密码哈希 + JWT 签发
        │   ├── jwt.strategy.ts    # Passport JWT 策略
        │   ├── jwt-auth.guard.ts  # JWT 认证守卫
        │   ├── auth.service.spec.ts  # 单元测试
        │   └── index.ts
        ├── members/               # 成员管理（核心业务）
        │   ├── members.module.ts
        │   ├── members.controller.ts  # 成员 CRUD + 关系管理
        │   ├── members.service.ts     # 成员增删改查 + 去重 + 审计
        │   ├── dto.ts                 # 数据验证对象
        │   ├── member.entity.ts
        │   └── members.service.spec.ts
        ├── search/                # 搜索模块
        │   ├── search.module.ts
        │   ├── search.controller.ts
        │   ├── search.service.ts  # 按姓名/世代/字号搜索
        │   └── search.service.spec.ts
        ├── ocr/                   # OCR 任务管理
        │   ├── ocr.module.ts
        │   ├── ocr.controller.ts  # 创建任务/查看结果/人工校对
        │   ├── ocr.service.ts     # 调用 OCR 微服务、存储候选结果
        │   └── ocr.worker.ts      # BullMQ Worker 消费 ocr-queue
        ├── uploads/               # 文件上传
        │   ├── uploads.module.ts
        │   ├── uploads.controller.ts  # Multer 文件接收
        │   └── uploads.service.ts     # 存储到 MinIO + 创建 SourceDocument
        ├── exports/               # 族谱导出（PDF）
        │   ├── exports.module.ts
        │   ├── exports.controller.ts  # 创建导出任务/下载
        │   ├── exports.service.ts     # PDF 生成（快速表/吊线图/行传）
        │   ├── exports.worker.ts      # BullMQ Worker 消费 export-queue
        │   └── exports.service.spec.ts
        ├── audits/                # 审计日志
        │   ├── audits.module.ts
        │   ├── audits.controller.ts
        │   ├── audits.service.ts  # 记录/查询审计日志
        │   ├── audits.service.spec.ts
        │   ├── index.ts
        │   └── .gitkeep
        ├── access-requests/       # v0.2: 协作者/查看者 申请审批
        │   ├── access-requests.module.ts
        │   ├── access-requests.controller.ts
        │   └── access-requests.service.ts
        ├── edit-requests/         # v0.2: 修改请求审批
        │   ├── edit-requests.module.ts
        │   ├── edit-requests.controller.ts
        │   └── edit-requests.service.ts
        ├── notifications/         # v0.2: 站内通知
        │   ├── notifications.module.ts
        │   ├── notifications.controller.ts
        │   └── notifications.service.ts
        ├── visualization/         # v0.2: 族谱可视化数据
        │   ├── visualization.module.ts
        │   ├── visualization.controller.ts
        │   └── visualization.service.ts
        └── health/                # 健康检查
```

## 前端 Web（apps/web）

```
apps/web/
├── index.html                     # SPA 入口 HTML
├── package.json                   # 前端依赖
├── tsconfig.json                  # TypeScript 配置
├── vite.config.ts                 # Vite 构建配置
└── src/
    ├── main.ts                    # Vue 应用入口（挂载 Pinia + Router）
    ├── App.vue                    # 根组件（初始化主题 + 用户信息）
    ├── router.ts                  # 路由配置 + 登录守卫
    ├── vite-env.d.ts              # Vite 类型声明
    ├── style.css                  # 全局样式（旧版，保留兼容）
    ├── styles/                    # CSS 样式体系
    │   ├── index.css              # 样式入口
    │   ├── variables.css          # CSS 变量（主题色、字体、阴影等）
    └── base.css               # 基础样式重置
    ├── composables/               # Vue 组合式函数
    │   └── useTheme.ts            # 主题切换（亮/暗模式）
    ├── stores/                    # Pinia 状态管理
    │   ├── index.ts               # 导出入口
    │   ├── auth.ts                # 认证状态（JWT + 多族谱切换）
    │   └── members.ts             # 成员数据状态
    ├── services/                  # API 通信层
    │   └── api.ts                 # axios 实例 + 所有 API 函数封装
    ├── components/                # 可复用组件
    │   ├── Card.vue               # 通用卡片（旧版）
    │   ├── NavBar.vue             # 导航栏（旧版）
    │   ├── NotificationBell.vue   # 通知铃铛（10s 轮询未读数）
    │   ├── StatusBadge.vue        # 状态标签
    │   ├── layout/                # 布局组件
    │   │   ├── AppHeader.vue      # 顶部导航头
    │   │   ├── AppLayout.vue      # 页面布局容器
    │   │   ├── MobileNav.vue      # 移动端底部导航
    │   │   └── index.ts
    │   ├── ui/                    # UI 基础组件库（以 Z 前缀命名）
    │   │   ├── ZButton.vue
    │   │   ├── ZCard.vue
    │   │   ├── ZInput.vue
    │   │   ├── ZSelect.vue
    │   │   ├── ZModal.vue
    │   │   ├── ZBadge.vue
    │   │   ├── ZLoading.vue
    │   │   └── index.ts
    │   └── viz/                   # 可视化图表组件
    │       ├── TreeChart.vue      # D3.js 树状图
    │       └── DropLineChart.vue  # D3.js 吊线图
    ├── pages/                     # 页面组件
    │   ├── LoginPage.vue          # 登录/注册
    │   ├── MembersPage.vue        # 成员列表（搜索 + 增删）
    │   ├── MemberDetailPage.vue   # 成员详情（关系管理）
    │   ├── OcrPage.vue            # OCR 任务管理
    │   ├── ExportsPage.vue        # 族谱导出
    │   ├── AuditsPage.vue         # 审计日志查看
    │   ├── FamilyManagePage.vue   # v0.2: 族谱管理（创建/探索/成员角色）
    │   ├── AccessRequestsPage.vue # v0.2: 申请审批管理
    │   └── VisualizationPage.vue  # v0.2: 族谱可视化展示
    └── assets/                    # 静态资源
```

## OCR 微服务（apps/ocr-service）

```
apps/ocr-service/
├── README.md                      # 服务说明
├── requirements.txt               # Python 依赖
└── main.py                        # FastAPI 应用（/health + /ocr 端点）
```
