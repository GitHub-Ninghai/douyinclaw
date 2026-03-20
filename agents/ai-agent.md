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