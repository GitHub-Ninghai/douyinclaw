/**
 * Claude API 封装
 */

import Anthropic from '@anthropic-ai/sdk';
import type { ContentBlock, ImageBlockParam, TextBlockParam } from '@anthropic-ai/sdk/resources/messages';
import type { VideoInfo, VideoAnalysis, ReplyStyle } from '@douyinclaw/shared';
import {
  formatVideoAnalysisPrompt,
  formatReplyGenerationPrompt,
  formatSparkMessagePrompt
} from './prompts.js';

// 默认模型
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const FALLBACK_MODEL = 'claude-3-5-haiku-20241022';

// 重试配置
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1秒
const MAX_RETRY_DELAY = 10000; // 10秒

// 请求超时
const REQUEST_TIMEOUT = 60000; // 60秒

/**
 * Token 使用统计
 */
export interface TokenUsage {
  input: number;
  output: number;
  total: number;
}

/**
 * Claude 服务配置
 */
export interface ClaudeConfig {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  timeout?: number;
  mockMode?: boolean;
}

/**
 * Claude 服务类
 */
export class ClaudeService {
  private client: Anthropic | null = null;
  private model: string;
  private maxTokens: number;
  private timeout: number;
  private mockMode: boolean;
  private totalTokenUsage: TokenUsage = { input: 0, output: 0, total: 0 };

  constructor(config: ClaudeConfig = {}) {
    const apiKey = config.apiKey ?? process.env.ANTHROPIC_API_KEY;

    this.model = config.model ?? DEFAULT_MODEL;
    this.maxTokens = config.maxTokens ?? 1024;
    this.timeout = config.timeout ?? REQUEST_TIMEOUT;
    this.mockMode = config.mockMode ?? (process.env.AI_MOCK_MODE === 'true');

    if (apiKey && !this.mockMode) {
      this.client = new Anthropic({
        apiKey,
        timeout: this.timeout,
      });
    }
  }

  /**
   * 分析视频内容
   * @param screenshots 视频截图 Buffer 数组
   * @param videoInfo 视频信息
   */
  async analyzeVideo(
    screenshots: Buffer[],
    videoInfo: VideoInfo
  ): Promise<{ analysis: VideoAnalysis; tokens: TokenUsage }> {
    if (this.mockMode || !this.client) {
      return this.mockAnalyzeVideo(videoInfo);
    }

    const prompt = formatVideoAnalysisPrompt(videoInfo);

    // 构建消息内容
    const content: Array<ImageBlockParam | TextBlockParam> = [];

    // 添加截图
    for (const screenshot of screenshots) {
      const base64 = screenshot.toString('base64');
      const mediaType = this.detectMediaType(screenshot);
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType,
          data: base64,
        },
      });
    }

    // 添加文本提示
    content.push({
      type: 'text',
      text: prompt,
    });

    const response = await this.withRetry(() =>
      this.client!.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        messages: [
          {
            role: 'user',
            content,
          },
        ],
      })
    );

    const textContent = this.extractTextContent(response.content);
    const analysis = this.parseAnalysisResult(textContent);
    const tokens: TokenUsage = {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens,
      total: response.usage.input_tokens + response.usage.output_tokens,
    };

    this.updateTokenUsage(tokens);

    return { analysis, tokens };
  }

  /**
   * 生成回复
   * @param analysis 视频分析结果
   * @param style 回复风格
   * @param maxLength 最大长度
   * @param chatHistory 聊天历史（可选）
   */
  async generateReply(
    analysis: VideoAnalysis,
    style: ReplyStyle,
    maxLength: number = 100,
    chatHistory?: string
  ): Promise<{ reply: string; tokens: TokenUsage }> {
    if (this.mockMode || !this.client) {
      return this.mockGenerateReply(analysis, style);
    }

    const prompt = formatReplyGenerationPrompt(analysis, style, maxLength, chatHistory);

    const response = await this.withRetry(() =>
      this.client!.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      })
    );

    const reply = this.extractTextContent(response.content);
    const tokens: TokenUsage = {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens,
      total: response.usage.input_tokens + response.usage.output_tokens,
    };

    this.updateTokenUsage(tokens);

    return { reply, tokens };
  }

  /**
   * 生成火花续命消息
   * @param friendName 朋友名字
   * @param recentMessages 最近发送的消息（避免重复）
   */
  async generateSparkMessage(
    friendName: string,
    recentMessages?: string[]
  ): Promise<{ message: string; tokens: TokenUsage }> {
    if (this.mockMode || !this.client) {
      return this.mockGenerateSparkMessage(friendName);
    }

    const prompt = formatSparkMessagePrompt(friendName, recentMessages);

    const response = await this.withRetry(() =>
      this.client!.messages.create({
        model: this.model,
        max_tokens: 256, // 火花消息较短
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      })
    );

    const message = this.extractTextContent(response.content);
    const tokens: TokenUsage = {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens,
      total: response.usage.input_tokens + response.usage.output_tokens,
    };

    this.updateTokenUsage(tokens);

    return { message, tokens };
  }

  /**
   * 获取总 Token 使用量
   */
  getTokenUsage(): TokenUsage {
    return { ...this.totalTokenUsage };
  }

  /**
   * 重置 Token 使用统计
   */
  resetTokenUsage(): void {
    this.totalTokenUsage = { input: 0, output: 0, total: 0 };
  }

  /**
   * 检查服务是否可用
   */
  isAvailable(): boolean {
    return this.mockMode || this.client !== null;
  }

  /**
   * 获取当前使用的模型
   */
  getModel(): string {
    return this.model;
  }

  /**
   * 带重试的请求执行
   */
  private async withRetry<T>(
    fn: () => Promise<T>,
    attempt: number = 1
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      const isRetryable = this.isRetryableError(error);
      const isLastAttempt = attempt >= MAX_RETRIES;

      if (!isRetryable || isLastAttempt) {
        throw error;
      }

      // 指数退避
      const delay = Math.min(
        INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1),
        MAX_RETRY_DELAY
      );

      await this.sleep(delay);

      // 如果是模型不可用错误，尝试降级模型
      if (this.isModelNotAvailableError(error) && this.model === DEFAULT_MODEL) {
        this.model = FALLBACK_MODEL;
      }

      return this.withRetry(fn, attempt + 1);
    }
  }

  /**
   * 判断是否为可重试的错误
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof Anthropic.APIError) {
      const status = error.status;
      // 5xx 错误或 429 限流可重试
      return status !== undefined && (status >= 500 || status === 429);
    }
    if (error instanceof Anthropic.APIConnectionError) {
      return true;
    }
    return false;
  }

  /**
   * 判断是否为模型不可用错误
   */
  private isModelNotAvailableError(error: unknown): boolean {
    if (error instanceof Anthropic.NotFoundError) {
      return true;
    }
    if (error instanceof Anthropic.BadRequestError) {
      const message = (error as Error).message?.toLowerCase() ?? '';
      return message.includes('model') && message.includes('not found');
    }
    return false;
  }

  /**
   * 从响应内容中提取文本
   */
  private extractTextContent(
    content: ContentBlock[]
  ): string {
    for (const block of content) {
      if (block.type === 'text') {
        return block.text;
      }
    }
    return '';
  }

  /**
   * 解析分析结果 JSON
   */
  private parseAnalysisResult(text: string): VideoAnalysis {
    try {
      // 尝试提取 JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      // 解析失败，返回默认值
    }

    // 返回基于文本的默认分析
    return {
      summary: text.slice(0, 100),
      mood: 'neutral',
      topics: ['general'],
      keyElements: [],
    };
  }

  /**
   * 检测图片媒体类型
   */
  private detectMediaType(buffer: Buffer): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' {
    // PNG magic number
    if (buffer[0] === 0x89 && buffer[1] === 0x50) {
      return 'image/png';
    }
    // JPEG magic number
    if (buffer[0] === 0xff && buffer[1] === 0xd8) {
      return 'image/jpeg';
    }
    // GIF magic number
    if (buffer[0] === 0x47 && buffer[1] === 0x49) {
      return 'image/gif';
    }
    // WebP magic number
    if (buffer[8] === 0x57 && buffer[9] === 0x45) {
      return 'image/webp';
    }
    // 默认 JPEG
    return 'image/jpeg';
  }

  /**
   * 更新 Token 使用统计
   */
  private updateTokenUsage(tokens: TokenUsage): void {
    this.totalTokenUsage.input += tokens.input;
    this.totalTokenUsage.output += tokens.output;
    this.totalTokenUsage.total += tokens.total;
  }

  /**
   * Sleep 工具函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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

// 默认导出单例
let defaultService: ClaudeService | null = null;

/**
 * 获取默认 Claude 服务实例
 */
export function getClaudeService(config?: ClaudeConfig): ClaudeService {
  if (!defaultService || config) {
    defaultService = new ClaudeService(config);
  }
  return defaultService;
}

/**
 * 重置默认服务实例（用于测试）
 */
export function resetClaudeService(): void {
  defaultService = null;
}
