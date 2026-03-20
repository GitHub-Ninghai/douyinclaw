# DouyinClaw 开发方案

## 一、产品定位

一个基于浏览器自动化 + AI 的抖音社交助手，核心功能：
1. **自动续火花** — 每日自动给火花好友发送消息/互动，保持火花不灭
2. **AI 智能回复** — 好友分享视频时，AI 分析视频内容并生成个性化回复
3. **管理面板** — 飞书机器人通知 + Web 管理后台

---

## 二、技术架构

```
┌─────────────────────────────────────────────────────┐
│                   用户接入层                          │
│  ┌──────────────┐  ┌──────────────┐                 │
│  │  Web 管理后台  │  │  飞书机器人   │                 │
│  │  (Next.js)   │  │  (通知+控制)  │                 │
│  └──────┬───────┘  └──────┬───────┘                 │
│         │                 │                          │
│  ┌──────▼─────────────────▼───────┐                 │
│  │        API Server (Hono)       │                 │
│  │   任务调度 / 状态管理 / 鉴权     │                 │
│  └──────────────┬─────────────────┘                 │
│                 │                                    │
│  ┌──────────────▼─────────────────┐                 │
│  │      Core Engine (核心引擎)     │                 │
│  │                                │                 │
│  │  ┌───────────┐ ┌────────────┐  │                 │
│  │  │ Browser   │ │ AI Service │  │                 │
│  │  │ Automator │ │ (Claude    │  │                 │
│  │  │(Playwright│ │  API)      │  │                 │
│  │  └───────────┘ └────────────┘  │                 │
│  │  ┌───────────┐ ┌────────────┐  │                 │
│  │  │ Scheduler │ │ Session    │  │                 │
│  │  │ (定时任务) │ │ Manager   │  │                 │
│  │  └───────────┘ └────────────┘  │                 │
│  └────────────────────────────────┘                 │
│                 │                                    │
│  ┌──────────────▼─────────────────┐                 │
│  │      Storage (SQLite/Redis)    │                 │
│  │  会话状态 / 好友列表 / 任务日志   │                 │
│  └────────────────────────────────┘                 │
└─────────────────────────────────────────────────────┘
```

### 技术栈选择

| 层级 | 技术 | 理由 |
|------|------|------|
| 浏览器自动化 | **Playwright (TypeScript)** | 抖音网页版操控，支持持久化session |
| 后端 API | **Hono + Node.js** | 轻量、TypeScript 原生 |
| 定时调度 | **node-cron + BullMQ** | 可靠的任务队列 |
| AI 服务 | **Claude API (Sonnet)** | 视频内容理解 + 回复生成 |
| 数据库 | **SQLite (better-sqlite3)** | 单机部署足够，零运维 |
| Web 前端 | **Next.js 14** | 管理后台 |
| 飞书集成 | **飞书开放平台 Bot API** | 通知推送 + 指令控制 |
| 部署 | **Docker Compose** | 一键部署，含浏览器环境 |

---

## 三、核心模块设计

### 3.1 Session Manager（会话管理）

```
抖音登录流程：
1. 启动 Playwright browser（headful 模式用于首次登录）
2. 打开 douyin.com → 弹出扫码登录
3. 用户在 Web 后台看到二维码截图 → 手机扫码
4. 登录成功后保存 cookies/storage state 到加密文件
5. 后续启动自动加载 session，失效时通知用户重新登录
```

关键设计：
- Cookie 持久化 + 定期心跳检测登录状态
- 登录失效时通过飞书/Web 推送通知
- 支持多账号管理

### 3.2 Spark Keeper（火花续命模块）

```
工作流：
1. 定时触发（每天定时，如早8点 + 晚8点双保险）
2. 打开抖音消息页 → 扫描好友列表
3. 识别带火花标记的好友
4. 对每个火花好友发送一条消息（可配置消息池）
5. 记录操作日志 → 推送飞书通知汇总
```

防检测策略：
- 随机化操作间隔（2-8秒）
- 消息内容从预设池随机选取，避免重复
- 模拟真人滚动/点击轨迹
- 每日操作时间随机偏移 ±30分钟

### 3.3 Smart Reply（AI 智能回复模块）

```
工作流：
1. 轮询/监听消息页，检测新消息
2. 识别消息类型 — 是否包含视频分享卡片
3. 如果是视频分享：
   a. 点击进入视频 → 截取视频封面/截图
   b. 提取视频标题、描述、评论等文本信息
   c. 将截图 + 文本送入 Claude API（vision）
   d. Claude 生成个性化回复
   e. 自动发送回复
4. 记录到日志，支持在后台查看/编辑回复风格
```

回复风格配置：
- 用户可在后台设定人设 prompt（如"幽默风趣"、"认真分析"）
- 支持针对不同好友设定不同回复风格
- 支持"审核模式"：AI 生成回复后先推送到飞书，用户确认后再发送

### 3.4 Web Dashboard（管理后台）

页面结构：
- **登录/绑定页**：展示抖音扫码二维码，管理登录状态
- **火花管理**：查看火花好友列表、续火花状态、手动触发
- **智能回复**：查看回复记录、配置回复风格、开关自动回复
- **设置**：飞书通知配置、操作频率、消息模板管理
- **日志**：所有操作的时间线视图

### 3.5 飞书集成

- **通知类**：火花续命成功/失败、登录失效、AI 回复记录
- **指令类**：`/spark now`（立即续火花）、`/reply on|off`（开关自动回复）、`/status`（查看状态）

---

## 四、项目目录结构

```
douyinclaw/
├── packages/
│   ├── core/                    # 核心引擎
│   │   ├── src/
│   │   │   ├── browser/         # Playwright 浏览器自动化
│   │   │   │   ├── client.ts        # 浏览器实例管理
│   │   │   │   ├── session.ts       # 登录/会话管理
│   │   │   │   ├── anti-detect.ts   # 防检测策略
│   │   │   │   └── selectors.ts     # DOM 选择器集中管理
│   │   │   ├── spark/           # 火花续命
│   │   │   │   ├── keeper.ts        # 核心续火花逻辑
│   │   │   │   ├── detector.ts      # 火花好友识别
│   │   │   │   └── messages.ts      # 消息池管理
│   │   │   ├── reply/           # 智能回复
│   │   │   │   ├── monitor.ts       # 新消息监听
│   │   │   │   ├── video-parser.ts  # 视频内容提取
│   │   │   │   └── responder.ts     # AI 生成 + 发送回复
│   │   │   ├── ai/              # AI 服务
│   │   │   │   ├── claude.ts        # Claude API 封装
│   │   │   │   └── prompts.ts       # Prompt 模板
│   │   │   ├── scheduler/       # 任务调度
│   │   │   │   └── index.ts
│   │   │   └── db/              # 数据层
│   │   │       ├── schema.ts        # 数据库 schema
│   │   │       └── index.ts
│   │   └── package.json
│   │
│   ├── server/                  # API 服务
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts          # 登录相关
│   │   │   │   ├── spark.ts         # 火花管理
│   │   │   │   ├── reply.ts         # 回复管理
│   │   │   │   └── settings.ts      # 设置
│   │   │   ├── middleware/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── web/                     # Web 前端
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── page.tsx         # 首页/仪表盘
│   │   │   │   ├── spark/           # 火花管理页
│   │   │   │   ├── reply/           # 回复管理页
│   │   │   │   ├── settings/        # 设置页
│   │   │   │   └── logs/            # 日志页
│   │   │   └── components/
│   │   └── package.json
│   │
│   └── feishu/                  # 飞书机器人
│       ├── src/
│       │   ├── bot.ts               # 机器人主逻辑
│       │   ├── commands.ts          # 指令处理
│       │   └── notify.ts            # 通知发送
│       └── package.json
│
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── turbo.json                   # Monorepo 配置
├── package.json
└── README.md
```

---

## 五、Claude Code Agent Teams 编排

### 团队结构（5 个专业 Agent）

```
                    ┌─────────────────┐
                    │  Orchestrator   │
                    │  (总指挥 Agent)  │
                    └────────┬────────┘
                             │
          ┌──────────┬───────┼───────┬──────────┐
          ▼          ▼       ▼       ▼          ▼
    ┌──────────┐ ┌───────┐ ┌────┐ ┌───────┐ ┌──────┐
    │ Browser  │ │  AI   │ │API │ │  Web  │ │Feishu│
    │ Agent    │ │ Agent │ │Agt │ │ Agent │ │Agent │
    └──────────┘ └───────┘ └────┘ └───────┘ └──────┘
```

---

### Agent 1: Orchestrator（总指挥）

**角色**：项目初始化、任务分发、集成测试、部署编排

**CLAUDE.md 指令**：
```markdown
# Orchestrator Agent

你是 DouyinClaw 项目的总指挥。

## 职责
1. 初始化 monorepo 项目结构（turborepo + pnpm workspace）
2. 按阶段分配任务给子 Agent
3. 集成各模块，确保端到端流程通畅
4. 编写 docker-compose.yml 和部署配置
5. 编写项目 README 和使用文档

## 开发阶段
按以下顺序推进，每个阶段完成后验证再进入下一阶段：

### Phase 1: 基础设施（你自己完成）
- [ ] 初始化 monorepo (turbo + pnpm)
- [ ] 配置 TypeScript、ESLint、共享 tsconfig
- [ ] 创建 packages/core、server、web、feishu 骨架
- [ ] 配置环境变量管理 (.env.example)
- [ ] 创建共享类型定义 (packages/shared/types.ts)

### Phase 2: 核心引擎（派发给 Browser Agent + AI Agent）
- 启动 Browser Agent → 完成浏览器自动化模块
- 启动 AI Agent → 完成 AI 服务模块
- 等待两者完成后进行集成

### Phase 3: API + 前端（派发给 API Agent + Web Agent）
- 启动 API Agent → 完成后端 API
- 启动 Web Agent → 完成管理后台
- 确保前后端接口对齐

### Phase 4: 飞书集成（派发给 Feishu Agent）
- 启动 Feishu Agent → 完成飞书机器人

### Phase 5: 集成 & 部署（你自己完成）
- [ ] 端到端集成测试
- [ ] Docker 打包
- [ ] 部署文档

## 子 Agent 启动命令模板
使用 `claude --chat` 启动子 Agent，传入对应的任务描述文件。

## 验证标准
每个阶段完成后运行：
- `pnpm build` 全量构建无错误
- `pnpm test` 测试通过
- `pnpm lint` 无 lint 错误
```

---

### Agent 2: Browser Agent（浏览器自动化专家）

**负责**: `packages/core/src/browser/`, `packages/core/src/spark/`, `packages/core/src/reply/monitor.ts`, `packages/core/src/reply/video-parser.ts`

**CLAUDE.md 指令**：
```markdown
# Browser Automation Agent

你负责 DouyinClaw 的浏览器自动化核心模块。

## 技术约束
- 使用 Playwright (TypeScript)
- 操作目标: douyin.com 网页版
- 所有 DOM 选择器集中在 selectors.ts，便于维护
- 必须实现防检测策略

## 任务清单

### Task 1: 浏览器客户端 (browser/client.ts)
- 初始化 Playwright Chromium 实例
- 支持 headless 和 headful 模式切换
- 配置 viewport、user-agent、语言等
- 实现优雅关闭和错误恢复

### Task 2: 会话管理 (browser/session.ts)
- 实现 `login()`: 打开 douyin.com，截取扫码二维码图片并返回
- 实现 `saveSession()`: 保存 cookies + localStorage 到文件
- 实现 `loadSession()`: 从文件恢复会话
- 实现 `checkSession()`: 心跳检测登录状态
- 会话文件使用 AES 加密存储

### Task 3: 防检测 (browser/anti-detect.ts)
- 随机化鼠标移动轨迹（贝塞尔曲线）
- 随机化打字速度（50-150ms/字）
- 随机化操作间隔（2-8秒）
- 随机化页面滚动行为
- WebDriver 检测绕过

### Task 4: 选择器管理 (browser/selectors.ts)
- 集中管理所有 CSS/XPath 选择器
- 为每个选择器提供备选方案（抖音可能改版）
- 导出类型安全的选择器对象

### Task 5: 火花续命 (spark/)
- `detector.ts`: 打开消息页，扫描好友列表，识别火花标记
  - 返回 { friendName, sparkDays, lastInteraction }[]
- `keeper.ts`: 对指定好友发送消息
  - 支持从消息池随机选取
  - 记录发送结果
- `messages.ts`: 消息池管理（CRUD + 随机选取）

### Task 6: 消息监听 + 视频解析 (reply/)
- `monitor.ts`: 轮询消息列表，检测未读新消息
  - 返回 { from, type, content, timestamp }[]
  - 区分普通文本 vs 视频分享卡片
- `video-parser.ts`: 对视频分享消息
  - 点击进入视频页
  - 截取视频截图（多帧）
  - 提取标题、描述、标签、点赞数等
  - 返回结构化 VideoInfo 对象

## 编码规范
- 所有异步操作必须有 try-catch 和超时处理
- 每个操作前 waitForSelector，超时默认 10s
- 关键操作记录日志 (console.log with prefix "[Browser]")
- 为每个公开函数编写单元测试（mock Playwright page）

## 交付物
- 所有上述 .ts 文件
- __tests__/ 目录下的测试文件
- 一个 demo.ts 可以独立运行验证核心流程
```

---

### Agent 3: AI Agent（AI 服务专家）

**负责**: `packages/core/src/ai/`, `packages/core/src/reply/responder.ts`

**CLAUDE.md 指令**：
```markdown
# AI Service Agent

你负责 DouyinClaw 的 AI 服务模块。

## 技术约束
- 使用 Anthropic Claude API (TypeScript SDK)
- 模型: claude-sonnet-4-20250514 (主力), 可降级到 haiku
- 支持 Vision（图片输入）用于视频截图分析

## 任务清单

### Task 1: Claude API 封装 (ai/claude.ts)
- 初始化 Anthropic client
- 封装 `analyzeVideo(screenshots: Buffer[], textInfo: VideoInfo): Promise<VideoAnalysis>`
  - 发送截图 + 文本信息给 Claude Vision
  - 返回结构化的视频内容分析
- 封装 `generateReply(analysis: VideoAnalysis, style: ReplyStyle, context?: ChatHistory): Promise<string>`
  - 根据视频分析 + 回复风格 + 聊天上下文生成回复
- 封装 `generateSparkMessage(friendName: string, history?: string[]): Promise<string>`
  - 可选：AI 生成个性化火花续命消息
- 实现请求重试（指数退避，最多3次）
- 实现 token 用量追踪

### Task 2: Prompt 模板 (ai/prompts.ts)
- `VIDEO_ANALYSIS_PROMPT`: 分析视频截图和信息，输出结构化摘要
- `REPLY_GENERATION_PROMPT`: 根据分析结果生成自然回复
  - 支持风格参数: casual（日常）、humorous（幽默）、analytical（分析）、brief（简短）
- `SPARK_MESSAGE_PROMPT`: 生成不重复的日常问候
- 所有 prompt 使用模板字符串，支持变量注入

### Task 3: 智能回复器 (reply/responder.ts)
- `processVideoShare(videoInfo: VideoInfo, screenshots: Buffer[], config: ReplyConfig): Promise<ReplyResult>`
  - 完整流程: 分析视频 → 生成回复 → 返回结果
- `ReplyConfig` 包含: style, maxLength, language, requireApproval
- `ReplyResult` 包含: reply, analysis, tokensUsed, confidence

## 类型定义
```typescript
interface VideoInfo {
  title: string;
  description: string;
  tags: string[];
  author: string;
  likes?: number;
  comments?: number;
}

interface VideoAnalysis {
  summary: string;
  mood: string;
  topics: string[];
  keyElements: string[];
}

interface ReplyStyle {
  tone: 'casual' | 'humorous' | 'analytical' | 'brief';
  persona?: string; // 自定义人设描述
  maxLength?: number;
}

interface ReplyResult {
  reply: string;
  analysis: VideoAnalysis;
  tokensUsed: { input: number; output: number };
  confidence: number;
}
```

## 编码规范
- API key 从环境变量读取 (ANTHROPIC_API_KEY)
- 所有 API 调用必须有超时和错误处理
- 实现 mock 模式用于测试（不实际调用 API）
- 为每个函数编写测试
```

---

### Agent 4: API Agent（后端 API 专家）

**负责**: `packages/server/`

**CLAUDE.md 指令**：
```markdown
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
```

### Task 2: API 路由
```
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
```

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
```

---

### Agent 5: Web Agent（前端专家）

**负责**: `packages/web/`

**CLAUDE.md 指令**：
```markdown
# Web Frontend Agent

你负责 DouyinClaw 的 Web 管理后台。

## 技术约束
- Next.js 14 (App Router)
- Tailwind CSS + shadcn/ui
- SWR 用于数据请求
- 与 API Server 通过 REST 通信

## 页面清单

### Page 1: Dashboard (/)
- 系统状态总览卡片：
  - 登录状态（在线/离线）
  - 今日火花续命：成功/失败/总数
  - 今日自动回复：条数
  - 下次执行时间
- 最近操作时间线（最近 10 条）

### Page 2: 登录绑定 (/login)
- 大尺寸二维码展示区
- 登录状态实时刷新（轮询）
- 登录成功后跳转到 Dashboard
- 已登录时显示账号信息 + 登出按钮

### Page 3: 火花管理 (/spark)
- 好友列表表格：昵称、火花天数、状态、最后互动时间
- 每行可开关"自动续火花"
- "立即续火花" 按钮
- 操作日志 tab

### Page 4: 智能回复 (/reply)
- 开关：自动回复 ON/OFF
- 回复风格选择器（下拉/卡片）
- 自定义人设 textarea
- 审核模式开关
- 回复记录列表：好友、视频标题、AI 回复、状态、时间

### Page 5: 设置 (/settings)
- 火花执行时间配置
- 消息检查频率
- 消息池管理（添加/删除/编辑）
- 飞书 Webhook URL 配置
- Claude API Key 配置

### Page 6: 日志 (/logs)
- 全量日志表格，支持筛选（类型、时间范围、状态）
- 分页

## UI 设计要求
- 深色主题为主（符合抖音风格）
- 响应式，支持移动端查看
- 状态变化使用 toast 通知
- 加载状态使用 skeleton

## 编码规范
- 组件拆分到 components/ 目录
- API 请求封装到 lib/api.ts
- 使用 TypeScript strict mode
```

---

### Agent 6: Feishu Agent（飞书集成专家）

**负责**: `packages/feishu/`

**CLAUDE.md 指令**：
```markdown
# Feishu Bot Agent

你负责 DouyinClaw 的飞书机器人集成。

## 技术约束
- 飞书开放平台 Bot API
- 使用 Webhook（Incoming）发送通知
- 使用 Event Subscription 接收指令（可选，初期用 Webhook 即可）

## 任务清单

### Task 1: 通知模块 (notify.ts)
- `sendSparkReport(results: SparkResult[])`: 火花续命结果汇总
  - 富文本卡片：成功✅ / 失败❌ 列表
- `sendReplyNotification(reply: ReplyResult)`: AI 回复通知
  - 包含：好友名、视频标题、AI 回复内容
  - 审核模式下包含"确认发送"/"取消"按钮
- `sendAlert(type: 'session_expired' | 'error', detail: string)`: 告警
- `sendDailySummary()`: 每日运营报告

### Task 2: 指令模块 (commands.ts)
- 解析飞书消息中的指令：
  - `/status` → 返回系统状态
  - `/spark now` → 触发即时续火花
  - `/reply on|off` → 开关自动回复
  - `/help` → 指令列表

### Task 3: 飞书卡片模板
- 设计美观的消息卡片 JSON 模板
- 支持交互按钮回调

## 编码规范
- Webhook URL 从环境变量读取
- 发送失败时重试 2 次
- 所有通知支持开关控制
```

---

## 六、Agent 执行流程（给 Orchestrator 的运行脚本）

```bash
#!/bin/bash
# run-agents.sh — DouyinClaw Agent Teams 开发脚本

PROJECT_DIR="$HOME/douyinclaw"

# ============ Phase 1: 项目初始化 ============
echo "🚀 Phase 1: Initializing project..."
claude --chat \
  --system-prompt "$(cat agents/orchestrator.md)" \
  --message "执行 Phase 1: 初始化 monorepo 项目结构。
    1. 创建 $PROJECT_DIR 目录
    2. 初始化 pnpm workspace + turborepo
    3. 创建所有 package 骨架
    4. 配置 TypeScript + ESLint
    5. 创建共享类型定义
    6. 创建 .env.example
    完成后确认所有 package 可以成功 build。"

# ============ Phase 2: 核心引擎（并行） ============
echo "🔧 Phase 2: Building core engine..."

# Browser Agent (后台运行)
claude --chat \
  --system-prompt "$(cat agents/browser-agent.md)" \
  --message "你现在在 $PROJECT_DIR 中工作。
    请按照任务清单依次完成 Task 1-6。
    每完成一个 Task，运行测试确认通过后再开始下一个。
    所有 Task 完成后，运行 demo.ts 验证核心流程。" &
BROWSER_PID=$!

# AI Agent (后台运行)
claude --chat \
  --system-prompt "$(cat agents/ai-agent.md)" \
  --message "你现在在 $PROJECT_DIR 中工作。
    请按照任务清单依次完成 Task 1-3。
    每完成一个 Task，运行测试确认通过后再开始下一个。
    实现 mock 模式确保测试不依赖实际 API。" &
AI_PID=$!

# 等待 Phase 2 完成
wait $BROWSER_PID $AI_PID

# ============ Phase 3: API + 前端（并行） ============
echo "🌐 Phase 3: Building API & Web..."

# API Agent
claude --chat \
  --system-prompt "$(cat agents/api-agent.md)" \
  --message "你现在在 $PROJECT_DIR 中工作。
    packages/core 已经完成。请按照任务清单完成 API 服务。
    优先完成数据库 schema 和核心路由，确保与 core 模块集成正确。" &
API_PID=$!

# Web Agent
claude --chat \
  --system-prompt "$(cat agents/web-agent.md)" \
  --message "你现在在 $PROJECT_DIR 中工作。
    请参考 API Agent 的路由定义完成前端页面。
    使用 mock 数据先完成 UI，后续对接真实 API。" &
WEB_PID=$!

wait $API_PID $WEB_PID

# ============ Phase 4: 飞书集成 ============
echo "📱 Phase 4: Feishu integration..."
claude --chat \
  --system-prompt "$(cat agents/feishu-agent.md)" \
  --message "你现在在 $PROJECT_DIR 中工作。
    请完成飞书机器人的所有模块。
    使用 API Server 的路由来实现指令功能。"

# ============ Phase 5: 集成 & 部署 ============
echo "🐳 Phase 5: Integration & Docker..."
claude --chat \
  --system-prompt "$(cat agents/orchestrator.md)" \
  --message "所有模块已完成。请执行 Phase 5:
    1. 运行全量 build 和测试，修复所有问题
    2. 编写 docker-compose.yml（含 Playwright 浏览器环境 + Redis）
    3. 编写 Dockerfile (multi-stage build)
    4. 编写完整的 README.md（安装、配置、使用说明）
    5. 创建 .env.example 包含所有需要的环境变量
    确保 docker-compose up 可以一键启动整个项目。"

echo "✅ DouyinClaw development complete!"
```

---

## 七、环境变量清单

```env
# .env.example

# === 抖音 ===
DOUYIN_SESSION_DIR=./data/sessions
DOUYIN_SESSION_SECRET=your-encryption-key

# === Claude AI ===
ANTHROPIC_API_KEY=sk-ant-xxxxx
AI_MODEL=claude-sonnet-4-20250514
AI_MAX_TOKENS=1024

# === 飞书 ===
FEISHU_WEBHOOK_URL=https://open.feishu.cn/open-apis/bot/v2/hook/xxxxx
FEISHU_APP_ID=cli_xxxxx
FEISHU_APP_SECRET=xxxxx

# === 服务 ===
API_PORT=3001
WEB_PORT=3000
API_SECRET=your-api-secret

# === Redis (BullMQ) ===
REDIS_URL=redis://localhost:6379

# === 调度 ===
SPARK_CRON_1=0 8 * * *
SPARK_CRON_2=0 20 * * *
MESSAGE_CHECK_INTERVAL=300000
SESSION_HEARTBEAT_INTERVAL=1800000
```

---

## 八、风险与应对

| 风险 | 概率 | 影响 | 应对 |
|------|------|------|------|
| 抖音网页版改版导致选择器失效 | 高 | 高 | 选择器集中管理 + 多备选 + 监控告警 |
| 账号被封/限制 | 中 | 高 | 严格防检测 + 操作频率限制 + 随机化 |
| 登录态频繁失效 | 中 | 中 | Cookie 持久化 + 心跳检测 + 即时通知 |
| 抖音增加反爬机制 | 中 | 高 | 真人行为模拟 + 指纹伪装 + 降频兜底 |
| Claude API 费用超预期 | 低 | 中 | Token 追踪 + 用量限制 + 可切换 Haiku |

---

## 九、迭代路线图

**v0.1 (MVP)**: 火花续命 + Web 二维码登录 + 基础后台
**v0.2**: AI 视频回复 + 飞书通知
**v0.3**: 审核模式 + 回复风格自定义 + 每日报告
**v0.4**: 多账号支持 + Docker 一键部署
**v1.0**: 稳定运行 + 完善的错误恢复 + 监控告警
