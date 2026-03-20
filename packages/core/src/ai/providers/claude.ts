/**
 * Claude (Anthropic) LLM Provider
 */

import Anthropic from '@anthropic-ai/sdk';
import type { ContentBlock, ImageBlockParam, TextBlockParam } from '@anthropic-ai/sdk/resources/messages';
import type { VideoInfo, VideoAnalysis, ReplyStyle } from '@douyinclaw/shared';
import type { ClaudeConfig, TokenUsage, ImageData, ChatHistory, LLMCapabilities } from '../types.js';
import { BaseLLMProvider } from './base.js';

// Claude 默认配置
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
// 备选模型（当主模型不可用时使用）
// const FALLBACK_MODEL = 'claude-3-5-haiku-20241022';

/**
 * Claude Provider 能力
 */
const CLAUDE_CAPABILITIES: LLMCapabilities = {
  vision: true,
  streaming: true,
  maxContextLength: 200000,
  supportedImageFormats: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
};

/**
 * Claude Provider 实现
 */
export class ClaudeProvider extends BaseLLMProvider {
  readonly name = 'claude' as const;
  readonly capabilities = CLAUDE_CAPABILITIES;

  private client: Anthropic | null = null;
  private _model: string;
  private apiKey: string | undefined;

  constructor(config: ClaudeConfig = { provider: 'claude' }) {
    super(config);

    this.apiKey = config.apiKey ?? process.env.ANTHROPIC_API_KEY;
    this._model = config.model ?? process.env.CLAUDE_MODEL ?? DEFAULT_MODEL;

    if (this.apiKey && !config.mockMode) {
      this.client = new Anthropic({
        apiKey: this.apiKey,
        timeout: this.config.timeout,
      });
    }
  }

  get model(): string {
    return this._model;
  }

  /**
   * 分析视频内容
   */
  async analyzeVideo(
    screenshots: ImageData[],
    videoInfo: VideoInfo
  ): Promise<{ analysis: VideoAnalysis; tokens: TokenUsage }> {
    if (this.config.mockMode || !this.client) {
      return this.mockAnalyzeVideo(videoInfo);
    }

    return this.withRetry(async () => {
      const prompt = this.buildVideoAnalysisPrompt(videoInfo);
      const content: Array<ImageBlockParam | TextBlockParam> = [];

      // 添加截图
      for (const img of screenshots) {
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: img.mimeType,
            data: this.encodeImage(img),
          },
        });
      }

      // 添加文本提示
      content.push({
        type: 'text',
        text: prompt,
      });

      const response = await this.client!.messages.create({
        model: this._model,
        max_tokens: this.config.maxTokens!,
        messages: [{ role: 'user', content }],
      });

      const textContent = this.extractTextContent(response.content);
      const analysis = this.parseAnalysisResult(textContent);
      const tokens: TokenUsage = {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
        total: response.usage.input_tokens + response.usage.output_tokens,
      };

      this.updateTokenUsage(tokens);
      return { analysis, tokens };
    });
  }

  /**
   * 生成回复
   */
  async generateReply(
    analysis: VideoAnalysis,
    style: ReplyStyle,
    maxLength: number = 100,
    chatHistory?: ChatHistory
  ): Promise<{ reply: string; tokens: TokenUsage }> {
    if (this.config.mockMode || !this.client) {
      return this.mockGenerateReply(analysis, style);
    }

    return this.withRetry(async () => {
      const prompt = this.buildReplyGenerationPrompt(analysis, style, maxLength, chatHistory);

      const response = await this.client!.messages.create({
        model: this._model,
        max_tokens: this.config.maxTokens!,
        messages: [{ role: 'user', content: prompt }],
      });

      const reply = this.extractTextContent(response.content);
      const tokens: TokenUsage = {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
        total: response.usage.input_tokens + response.usage.output_tokens,
      };

      this.updateTokenUsage(tokens);
      return { reply, tokens };
    });
  }

  /**
   * 生成火花续命消息
   */
  async generateSparkMessage(
    friendName: string,
    recentMessages?: string[]
  ): Promise<{ message: string; tokens: TokenUsage }> {
    if (this.config.mockMode || !this.client) {
      return this.mockGenerateSparkMessage(friendName);
    }

    return this.withRetry(async () => {
      const prompt = this.buildSparkMessagePrompt(friendName, recentMessages);

      const response = await this.client!.messages.create({
        model: this._model,
        max_tokens: 256,
        messages: [{ role: 'user', content: prompt }],
      });

      const message = this.extractTextContent(response.content);
      const tokens: TokenUsage = {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
        total: response.usage.input_tokens + response.usage.output_tokens,
      };

      this.updateTokenUsage(tokens);
      return { message, tokens };
    });
  }

  /**
   * 检查 Provider 是否可用
   */
  isAvailable(): boolean {
    return this.config.mockMode || this.client !== null;
  }

  /**
   * 发送消息（实现基类抽象方法）
   */
  protected async sendMessage(
    _messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string | unknown }>,
    _maxTokens?: number
  ): Promise<{ content: string; tokens: TokenUsage }> {
    // Claude 使用专门的方法，此处仅为接口实现
    throw new Error('Use specific methods for Claude provider');
  }

  /**
   * 从响应内容中提取文本
   */
  private extractTextContent(content: ContentBlock[]): string {
    for (const block of content) {
      if (block.type === 'text') {
        return block.text;
      }
    }
    return '';
  }

  // ==================== Prompt 构建方法 ====================

  private buildVideoAnalysisPrompt(videoInfo: VideoInfo): string {
    return `你是一个视频内容分析专家。请分析以下视频截图和信息，输出结构化的分析结果。

## 视频信息
- 标题: ${videoInfo.title || '未知'}
- 描述: ${videoInfo.description || '无描述'}
- 作者: ${videoInfo.author || '未知作者'}
- 标签: ${videoInfo.tags?.join(', ') || '无标签'}

请分析视频截图和以上信息，返回以下 JSON 格式的分析结果：
{
  "summary": "视频内容的一句话摘要（20-50字）",
  "mood": "视频的整体氛围/情绪（如：轻松、搞笑、励志、温馨、紧张等）",
  "topics": ["主题1", "主题2", "主题3"],
  "keyElements": ["关键元素1", "关键元素2", "关键元素3"]
}

只返回 JSON，不要有其他文字。`;
  }

  private buildReplyGenerationPrompt(
    analysis: VideoAnalysis,
    style: ReplyStyle,
    maxLength: number,
    chatHistory?: ChatHistory
  ): string {
    const toneDescriptions: Record<ReplyStyle['tone'], string> = {
      casual: '日常随意，像朋友聊天一样自然',
      humorous: '幽默风趣，带点调侃和玩笑',
      analytical: '理性分析，有条理地讨论内容',
      brief: '简洁明了，言简意赅',
    };

    let prompt = `你是一个擅长社交互动的助手，需要根据视频分析结果生成自然、有趣的回复。

## 视频分析
${JSON.stringify(analysis, null, 2)}

## 回复风格
- 语调: ${toneDescriptions[style.tone] || toneDescriptions.casual}
${style.persona ? `- 人设: ${style.persona}` : ''}
- 最大长度: ${maxLength} 字`;

    if (chatHistory && chatHistory.length > 0) {
      prompt += `\n\n## 聊天上下文\n${chatHistory.map((m) => `${m.role}: ${m.content}`).join('\n')}`;
    }

    prompt += `

请生成一个自然、符合风格的回复。回复应该：
1. 与视频内容相关
2. 体现对分享者的关注
3. 引发进一步的对话

只返回回复文字，不要有其他内容。`;

    return prompt;
  }

  private buildSparkMessagePrompt(friendName: string, recentMessages?: string[]): string {
    let prompt = `你是一个擅长日常问候的朋友，需要生成一条温馨、不重复的问候消息来维持友谊火花。

## 朋友名字
${friendName}`;

    if (recentMessages && recentMessages.length > 0) {
      prompt += `\n\n## 最近发送过的消息（请勿重复）\n${recentMessages.map((m, i) => `${i + 1}. ${m}`).join('\n')}`;
    }

    prompt += `

请生成一条简短、温馨的日常问候消息（10-30字）。要求：
1. 自然、不做作
2. 避免与最近消息重复
3. 可以包含：天气、日常、关心、分享等话题

只返回消息文字，不要有其他内容。`;

    return prompt;
  }

  // ==================== Mock 方法 ====================

  private mockAnalyzeVideo(videoInfo: VideoInfo): { analysis: VideoAnalysis; tokens: TokenUsage } {
    return {
      analysis: {
        summary: `这是一个关于${videoInfo.title || '未知内容'}的视频`,
        mood: 'neutral',
        topics: videoInfo.tags?.slice(0, 3) || ['general'],
        keyElements: ['视频内容', '分享互动'],
      },
      tokens: { input: 100, output: 50, total: 150 },
    };
  }

  private mockGenerateReply(
    analysis: VideoAnalysis,
    style: ReplyStyle
  ): { reply: string; tokens: TokenUsage } {
    const replies: Record<ReplyStyle['tone'], string> = {
      casual: `这个视频挺有意思的，${analysis.summary}`,
      humorous: `哈哈，这个视频绝了！${analysis.summary}`,
      analytical: `看了这个视频，我觉得${analysis.summary}，挺有启发`,
      brief: '不错！',
    };

    return {
      reply: replies[style.tone] || replies.casual,
      tokens: { input: 80, output: 30, total: 110 },
    };
  }

  private mockGenerateSparkMessage(friendName: string): { message: string; tokens: TokenUsage } {
    const messages = [
      `${friendName}，今天怎么样？`,
      `嘿 ${friendName}，最近忙啥呢？`,
      `${friendName}，天气不错，心情也好`,
      `早上好啊 ${friendName}！`,
      `${friendName}，周末有什么安排？`,
    ];

    const randomMessage = messages[Math.floor(Math.random() * messages.length)] ?? messages[0]!;

    return {
      message: randomMessage,
      tokens: { input: 50, output: 20, total: 70 },
    };
  }
}

/**
 * 创建 Claude Provider 实例
 */
export function createClaudeProvider(config?: Partial<ClaudeConfig>): ClaudeProvider {
  return new ClaudeProvider({ provider: 'claude', ...config });
}
