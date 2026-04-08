# 7. 总结与建议 (Summary & Recommendations)

## 架构亮点

1.  **Monorepo 组织**: 使用 npm workspaces 将前后端代码组织在同一仓库，便于统一版本管理和微服务部署。
2.  **优雅的异步处理**: 
    -   利用 **BullMQ (Redis)** 和独立 Worker 进程剥离了耗时的 OCR 推理和 PDF 导出功能，完全避免了 Node.js 主线程的阻塞。
    -   前端使用轮询机制（10秒）获取通知更新和 OCR 状态，简单且有效。
3.  **灵活的权限设计**: 实现了 `admin > creator > collaborator > viewer` 的层级继承。使用 `@Roles()` 装饰器校验非常直观。协作申请与修改审批功能大大加强了公开族谱的数据安全性，防止被恶意篡改。

## 技术债务与潜在问题

1.  **JSON 解析安全性风险 (Edit Payload)**:
    -   `EditRequest` 中使用 JSON 字符串存储用户修改的负荷(`editPayload`)，而在 `EditRequestsService.executeEdit` 方法中，直接 `JSON.parse` 并应用到 Prisma 数据更新中。
    -   **风险**: 缺少对 payload 的结构和数据类型的运行时校验（未复用 `UpdateMemberDto` 类的验证通道）。如果恶意用户构造恶意的 JSON 字符串，可能会绕过校验修改越权字段，或引发运行时异常。
    -   **建议**: 在执行 `executeEdit` 之前，将 JSON 反序列化的对象通过 `class-transformer` 和 `class-validator` 验证，确保符合 DTO 定义。

2.  **级联删除隐藏的孤儿数据**:
    -   当 `Member` 被删除时，代码（`members.service.ts`）手动删除了关联的 `Relationship`。但这对于基于引用的其他实体（如果有新功能的挂载）容易遗漏。
    -   **建议**: 在 Prisma Schema 的 `Relationship` 模型上，对 `fromMemberId` 和 `toMemberId` 外键增加 `onDelete: Cascade`（如果 Prisma 支持多重外键路径或触发器实现），或通过事务保证数据的一致清理。

3.  **OCR 服务的降级回退 (Fallback)**:
    -   在 Python 的 OCR 微服务中，当图片获取失败或引擎报错时，默认返回了固定的“张三”伪造数据作为“回退结果”以防链路报错。
    -   **风险**: 这种处理在开发环境有用，但在生产环境会导致用户看到混淆数据。
    -   **建议**: 将占位数据回退移除，抛出标准 HTTP 错误，并在 NestJS 的 Worker 层捕获错误，将 OcrTask 更新为 `failed` 状态。

4.  **树状图与吊线图的 O(N) 算法隐患**:
    -   目前 `VisualizationService` 是一次性取出全部成员（`findMany`），在内存中拼接整棵树。
    -   **风险**: 当族谱成员规模膨胀（如万人规模时），全量拉取会导致 API 内存溢出（OOM）和前端 D3.js 渲染卡死。
    -   **建议**: 后续可考虑结合图数据库（如 Neo4j，或者使用 PostgreSQL 的 Recursive CTE 查询）支持按**层级懒加载**或**核心成员的辐射加载**。

## 扩展性建议

*   **引入 WebSocket**: 针对 10 秒轮询的通知逻辑和导出/OCR任务进度查询，后续可考虑引入 `@nestjs/websockets` 实现更实时的状态推送。
*   **权限精细化**: 当前 `@Roles` 控制了功能层面的拦截，但对于数据行级权限（例如限制查看某些人的生平或字段的可见性策略 `VisibilityPolicy`）目前尚未全面应用到查询拦截中。未来可在 Prisma 层面加入统一的拦截中间件处理行级隐私过滤。
