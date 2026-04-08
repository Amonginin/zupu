# v0.2 系统详细设计与开发

## 阶段一：设计文档
- [x] 研究现有项目架构（Prisma schema/后端模块/前端路由/v0.1设计文档）
- [x] 编写v0.2系统详细设计文档
- [x] 用户评审设计文档（2026-04-03确认所有技术决策）

## 阶段二：M1 - 权限与修复
### 后端核心
- [x] Prisma Schema 变更及校验
- [x] 权限守卫开发（RolesGuard + Roles 装饰器）
- [x] Families、AccessRequests、EditRequests、Notifications 模块开发
- [x] 审计日志集成
- [x] 原 M1 后端单元测试验证

### 阶段二（补丁）：M1 问题修复
- [x] **后端**：在 Families 模块添加 `exploreFamilies` 方法和 `GET /families/explore` 路由
- [x] **后端**：修改 `EditRequestsController` 的 `create` 接口权限为 `@Roles('viewer')`
- [x] **前端**：API层加入 `exploreFamilies` 服务调用
- [x] **前端**：将 `FamilyManagePage` 改为双板块视图（我的家族 / 搜索与加入新家族）
- [x] **前端**：在 `MembersPage` 增加家族切换组件
- [x] **前端**：在 `MembersPage` 适配角色权限逻辑（非加入家族不展现操作、查看者拦截点击并转为申请修改请求）

### 前端功能页面
- [x] NotificationBell 通知铃铛组件
- [x] FamilyManagePage （基础版本）
- [x] AccessRequestsPage 三标签页
- [x] 路由注册与导航栏更新

## 阶段三：M2 - 族谱可视化
- [x] **后端**：创建 `VisualizationModule` 及构建 `tree` 和 `dropline` 全量数据的 Service
- [x] **后端**：添加具有权限把控的可视化 API 路由口 (`VisualizationController`)
- [x] **前端**：安装 `d3` 和 `@types/d3`
- [x] **前端**：开发 `TreeChart.vue` 和 `DropLineChart.vue` 并完成大屏路由
- [x] **前端**：引入高清图截取并导出功能组件

## 阶段四：M3 - 优化与收尾
- [x] **后端**：修改 Prisma 的 `ExportTask`，增加与接纳导出规格字段 `type`
- [x] **后端**：重构 `ExportsService` 的 `runTask` 为多路派发器并绘制行传等版式
- [x] **前端**：重新装配 `ExportsPage.vue` 的导出面板，增加单选卡样式及状态传递
- [x] **全局**：全站 UI 风格一致性对齐与微调打磨（已在前文通过NavBar等集成补齐）
- [x] **部署**：回归通过后端所有用例并整理文档宣告 v0.2 终结
