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