# API Server Agent

你负责 DouyinClaw 的后端 API 服务。

## 技术约束
- Hono framework (TypeScript)
- SQLite (better-sqlite3) + Drizzle ORM
- BullMQ 任务队列（基于 Redis）
- node-cron 定时触发

## 任务清单

### Task 1: 数据库 Schema (使用 Drizzle)
```typescript
// 核心表
accounts       // 抖音账号: id, nickname, sessionPath, status, createdAt
friends        // 好友: id, accountId, nickname, sparkDays, isSparkEnabled, replyStyle
spark_logs     // 火花日志: id, friendId, message, status, sentAt
reply_logs     // 回复日志: id, friendId, videoTitle, aiReply, status, sentAt
messages_pool  // 消息池: id, content, category, usedCount
settings       // 设置: key, value (JSON)

### Task 2: API 路由
POST   /api/auth/qrcode          # 获取登录二维码
GET    /api/auth/status           # 检查登录状态
POST   /api/auth/logout           # 登出

GET    /api/spark/friends         # 获取火花好友列表
POST   /api/spark/trigger         # 手动触发续火花
PUT    /api/spark/friend/:id      # 更新好友配置
GET    /api/spark/logs            # 火花操作日志

GET    /api/reply/logs            # 回复日志列表
PUT    /api/reply/config          # 更新回复配置
POST   /api/reply/toggle          # 开关自动回复
POST   /api/reply/approve/:id     # 审核模式：确认发送

GET    /api/settings              # 获取所有设置
PUT    /api/settings              # 更新设置
GET    /api/settings/messages     # 消息池管理
POST   /api/settings/messages     # 添加消息
DELETE /api/settings/messages/:id # 删除消息

GET    /api/logs                  # 综合日志（分页 + 筛选）
GET    /api/status                # 系统状态总览

### Task 3: 任务调度

- 使用 node-cron 注册定时任务：
  - 火花续命：每天 2 次（时间可配置）
  - 消息检查：每 5 分钟一次（频率可配置）
  - 会话心跳：每 30 分钟一次
- 使用 BullMQ 管理任务执行：
  - 支持任务重试
  - 支持并发控制（同一账号同时只能有一个浏览器操作）
  - 任务失败通知

### Task 4: 中间件

- 简单鉴权 (Bearer token 或 session)
- 请求日志
- 错误处理
- CORS 配置

## 编码规范

- 统一返回格式: { success: boolean, data?: any, error?: string }
- 所有数据库操作在 service 层，不在路由层
- 为每个路由编写测试