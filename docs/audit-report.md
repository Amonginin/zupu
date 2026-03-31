# 族谱系统代码审查报告

- 审查日期：2026-03-31
- 基准文档：
  - docs/requirements/2026-04-01-zupu-requirements-analysis.md
  - docs/design/2026-04-01-zupu-system-design-a.md

---

## 一、各文件/功能完整度清单

### API 后端 (apps/api)

#### 基础设施层 (src/infra)

| 文件 | 状态 | 说明 |
|------|------|------|
| infra/prisma/prisma.service.ts | **[完整]** | Prisma 客户端封装正常 |
| infra/prisma/prisma.module.ts | **[完整]** | 模块导出正确 |
| infra/storage/storage.service.ts | **[完整]** | MinIO 上传、预签名 URL 功能齐全 |
| infra/storage/storage.module.ts | **[完整]** | 模块导出正确 |
| infra/queue/queue.service.ts | **[完整]** | BullMQ 队列定义正确 |
| infra/queue/queue.module.ts | **[完整]** | 模块导出正确 |
| infra/families/families.service.ts | **[基本完整]** | 自动创建 demo-family 便于开发，但缺少正式的家族管理接口 |
| infra/families/families.module.ts | **[完整]** | 模块导出正确 |
| prisma/schema.prisma | **[完整]** | 数据模型与设计文档一致，包含所有 11 个实体 |

#### 业务模块层 (src/modules)

| 文件 | 状态 | 说明 |
|------|------|------|
| modules/health/health.controller.ts | **[完整]** | /health 端点正常 |
| modules/members/members.controller.ts | **[不完整]** | 缺少 DELETE 接口，缺少关系管理接口 |
| modules/members/members.service.ts | **[不完整]** | 缺少 delete 方法，缺少去重提示逻辑 |
| modules/members/dto.ts | **[基本完整]** | DTO 验证规则完整，缺少 gender/birthDate/deathDate 字段 |
| modules/ocr/ocr.controller.ts | **[基本完整]** | 核心接口完整，缺少 GET /candidates 独立接口 |
| modules/ocr/ocr.service.ts | **[基本完整]** | OCR 流程完整，reviewTask 未关联入库成员 |
| modules/ocr/ocr.worker.ts | **[完整]** | Worker 启动和关闭逻辑正确 |
| modules/search/search.controller.ts | **[有 Bug]** | 内存过滤而非数据库查询，3000人规模性能不达标 |
| modules/uploads/uploads.controller.ts | **[完整]** | 文件上传接口正常 |
| modules/uploads/uploads.service.ts | **[完整]** | 上传逻辑正确 |
| modules/exports/exports.controller.ts | **[完整]** | 导出接口完整 |
| modules/exports/exports.service.ts | **[有 Bug]** | PDF 导出实际输出纯文本，非真正 PDF |
| modules/exports/exports.worker.ts | **[完整]** | Worker 逻辑正确 |
| **缺失：auth 模块** | **[缺失]** | 设计文档 §3.2 定义的鉴权模块未实现 |
| **缺失：audits 模块** | **[缺失]** | 设计文档 §3.2 定义的审计日志模块未实现 |
| **缺失：visibility 模块** | **[缺失]** | 设计文档 §3.2 定义的字段可见策略模块未实现 |
| **缺失：relations 接口** | **[缺失]** | 设计文档 §6 定义的 POST /members/:id/relations 未实现 |

### Web 前端 (apps/web)

| 文件 | 状态 | 说明 |
|------|------|------|
| src/main.ts | **[完整]** | Vue 应用入口正常 |
| src/App.vue | **[基本完整]** | 布局框架存在，缺少导航菜单 |
| src/router.ts | **[不完整]** | 缺少登录页、成员详情页、审计日志页路由 |
| src/services/api.ts | **[基本完整]** | 核心 API 封装完整，缺少关系、审计等接口 |
| src/pages/MembersPage.vue | **[不完整]** | 仅有列表和新增，缺少删除、详情、关系浏览 |
| src/pages/OcrPage.vue | **[不完整]** | 上传+任务创建有，缺少校对确认入库 UI |
| src/pages/ExportsPage.vue | **[完整]** | 导出功能 UI 完整 |
| **缺失：LoginPage.vue** | **[缺失]** | 设计文档 §3.1 定义的登录页未实现 |
| **缺失：MemberDetailPage.vue** | **[缺失]** | 设计文档 §3.1 定义的成员详情与关系浏览页未实现 |
| **缺失：AuditsPage.vue** | **[缺失]** | 设计文档 §3.1 定义的审计日志页未实现 |
| **缺失：SearchPage.vue** | **[缺失]** | 检索功能应有独立页面或整合到 Members |

### OCR 服务 (apps/ocr-service)

| 文件 | 状态 | 说明 |
|------|------|------|
| main.py | **[基本完整]** | PaddleOCR 集成正确，有 fallback 机制，但字段解析较粗糙 |
| requirements.txt | **[完整]** | 依赖声明正确 |

### 测试代码

| 模块 | 状态 | 说明 |
|------|------|------|
| **缺失：所有测试文件** | **[严重不完整]** | 设计文档 §10 要求单元测试、集成测试、E2E测试，当前完全缺失 |

---

## 二、关键 Bug 和问题汇总

### 🔴 严重（阻塞核心流程）

**1. 无鉴权机制，任何人可访问所有数据**
- 文件：整个 API 层
- 描述：所有接口无 JWT 验证，x-family-id 由客户端传入无校验
- **修复**：实现 auth 模块，添加 JWT Guard 到所有受保护路由

**2. 检索使用内存过滤，3000人规模性能不达标**
- 文件：`modules/search/search.controller.ts`
- 描述：先全量查询再 filter，无法满足 P95 < 1s 目标
- **修复**：改为数据库 WHERE 条件查询，利用已建索引

**3. 测试代码完全缺失**
- 文件：无
- 描述：设计文档要求单元测试、集成测试、E2E 测试，当前为零
- **修复**：至少补充核心服务的单元测试和主流程集成测试

### 🟡 重要（影响功能但不阻塞）

**4. PDF 导出实际输出纯文本**
- 文件：`modules/exports/exports.service.ts:57-70`
- 描述：生成的是 UTF-8 文本文件，MIME 类型标为 PDF 但内容非 PDF
- **修复**：集成 Puppeteer/Playwright 或 pdf-lib 生成真正 PDF

**5. OCR 校对后未关联入库成员**
- 文件：`modules/ocr/ocr.service.ts:53-60`
- 描述：reviewTask 只更新状态为 reviewed，未将候选数据写入 Member
- **修复**：review 接口应接收确认字段并创建对应 Member 记录

**6. 成员缺少 DELETE 接口**
- 文件：`modules/members/members.controller.ts`
- 描述：设计文档 §6 要求 DELETE /api/members/:id
- **修复**：在 controller 和 service 中添加 delete 方法

**7. 成员关系管理接口缺失**
- 文件：无
- 描述：设计文档 §6 要求 POST /api/members/:id/relations
- **修复**：新增 relations 相关接口和服务方法

**8. 审计日志模块缺失**
- 文件：无
- 描述：设计文档 §3.2 要求 audits 模块记录关键操作
- **修复**：新增 audits 模块，在成员增删改、导出等操作时写入日志

**9. 字段可见策略未实现**
- 文件：无
- 描述：设计文档 §7 要求根据 VisibilityPolicy 过滤响应字段
- **修复**：实现 visibility 模块，在返回成员数据前按角色过滤

**10. 前端缺少检索 UI**
- 文件：`pages/MembersPage.vue`
- 描述：无姓名/辈分搜索框
- **修复**：添加搜索表单并调用 /search/members 接口

### 🟢 改进项

**11. DTO 缺少部分字段**
- 文件：`modules/members/dto.ts`
- 描述：缺少 gender、birthDate、deathDate 字段
- **修复**：补充字段定义

**12. OCR 候选字段解析过于简单**
- 文件：`apps/ocr-service/main.py:46-53`
- 描述：仅返回 raw_text，未解析姓名、世代等结构化字段
- **修复**：添加基于规则或模板的字段提取逻辑

**13. 前端缺少状态管理**
- 文件：`apps/web/src/`
- 描述：未使用 Pinia 管理会话、租户上下文
- **修复**：添加 stores 目录，管理 auth 和 family 状态

**14. 硬编码 demo-family**
- 文件：多处 controller 默认值
- 描述：x-family-id 默认值 'demo-family' 应在认证后从 JWT 获取
- **修复**：实现 auth 后从 token 中解析 familyId

---

## 三、优先级排序待办事项

### P0 — 立即修复（阻塞核心闭环）

| # | 待办 | 影响 | 涉及文件 |
|---|------|------|---------|
| 1 | 实现 auth 模块（JWT 登录、角色校验、Guard） | 安全性 | 新增 modules/auth/* |
| 2 | 修复 search 使用数据库查询 | 性能目标 | modules/search/search.controller.ts |
| 3 | 补充核心单元测试 | 质量保障 | 新增 *.spec.ts |

### P1 — 尽快修复（MVP 体验关键）

| # | 待办 | 影响 | 涉及文件 |
|---|------|------|---------|
| 4 | 实现真正 PDF 导出 | 导出功能可用 | modules/exports/exports.service.ts |
| 5 | OCR 校对后入库成员 | OCR 流程闭环 | modules/ocr/ocr.service.ts |
| 6 | 添加成员 DELETE 接口 | 成员管理完整 | modules/members/* |
| 7 | 添加关系管理接口 | 关系数据可用 | 新增关系相关服务 |
| 8 | 实现审计日志模块 | 操作追溯 | 新增 modules/audits/* |
| 9 | 前端添加登录页 | 认证 UI | 新增 pages/LoginPage.vue |
| 10 | 前端添加检索功能 | 检索可用 | 修改 MembersPage.vue |

### P2 — 后续迭代

| # | 待办 | 影响 | 涉及文件 |
|---|------|------|---------|
| 11 | 实现字段可见策略 | 隐私控制 | 新增 modules/visibility/* |
| 12 | 前端成员详情与关系浏览页 | 用户体验 | 新增 MemberDetailPage.vue |
| 13 | 前端审计日志页 | 管理功能 | 新增 AuditsPage.vue |
| 14 | Pinia 状态管理 | 代码质量 | 新增 stores/* |
| 15 | OCR 结构化字段提取 | OCR 准确率 | apps/ocr-service/main.py |
| 16 | 补充 DTO 缺失字段 | 数据完整 | modules/members/dto.ts |
| 17 | 导出前预览功能 | 用户体验 | FR-009 |
| 18 | 别名检索 | 检索增强 | FR-010 |

---

## 结论

**当前进度约 50%**。核心数据模型完整，OCR/导出异步任务链路基本打通。但缺少 **鉴权模块**（P0 安全问题）、**关系管理**、**审计日志** 等 MVP 必需功能。检索实现存在性能 Bug。测试代码完全缺失。

建议优先完成：
1. auth 模块 + JWT Guard
2. 修复 search 数据库查询
3. 补充核心测试
4. 完善 OCR 入库 + 关系管理 + 审计日志

完成以上项后可达到 MVP 可演示状态。
