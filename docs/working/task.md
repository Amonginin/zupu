# v0.2 系统详细设计与开发

## 阶段一：设计文档
- [x] 研究现有项目架构（Prisma schema/后端模块/前端路由/v0.1设计文档）
- [x] 编写v0.2系统详细设计文档
- [x] 用户评审设计文档（2026-04-03确认所有技术决策）

## 阶段二：M1 - 权限与修复 ✅
### 后端
- [x] Prisma Schema 变更（Role 枚举扩展、新增 AccessRequest/EditRequest/Notification 表、Family 扩展）
- [x] 生成 Prisma Client 并修复 v0.1 测试中的 SHA256 Hash Bug
- [x] 权限守卫开发（RolesGuard + Roles 装饰器 + 角色继承逻辑）
- [x] Families 模块重构与业务 REST 接口（创建族谱、权限管理等）
- [x] 申请/审批流程 API 开发（AccessRequests 模块）
- [x] 修改申请审批流程 API 开发（EditRequests 模块）
- [x] 站内通知系统开发（Notifications 模块）
- [x] 审计日志集成到业务模块（Members 模块增删改查集成 AuditLog）
- [x] 后端单元测试验证（32/32 Passed）

### 前端
- [x] API 服务层扩展（族谱管理/申请审批/修改请求/通知 接口）
- [x] NotificationBell 通知铃铛组件（10s 轮询 + 面板 + 标记已读）
- [x] FamilyManagePage 族谱管理页面（创建/列表/切换/公开程度/角色管理）
- [x] AccessRequestsPage 申请审批页面（协作申请/修改请求/我的申请 三标签页）
- [x] 路由注册（/families, /requests）
- [x] NavBar 导航栏更新（新增链接 + 集成铃铛）
- [x] 前端 TypeScript 编译验证（vue-tsc 零错误）

## 阶段三：M2 - 族谱可视化
- [ ] Visualization 后端 API（树状图/吊线图数据构建）
- [ ] 前端 D3.js 树状图组件
- [ ] 前端 D3.js 吊线图组件
- [ ] 可视化切换与全屏交互页面

## 阶段四：M3 - 优化与收尾
- [ ] PDF 导出扩展（吊线图版式渲染器）
- [ ] PDF 导出扩展（欧式行传版式渲染器）
- [ ] 全站 UI 风格现代化优化
- [ ] 3000 人规模性能压力测试与优化
- [ ] 回归测试与文档同步
