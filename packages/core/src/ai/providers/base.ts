/**
 * LLM Provider 基础抽象类
 * 提供共享的重试、错误处理和 token 追踪逻辑
 */

import type { VideoInfo, VideoAnalysis, ReplyStyle } from '@douyinclaw/shared';
import type {
  LLMProvider,
  AIProviderType,
  LLMCapabilities,
  TokenUsage,
  BaseLLMConfig,
  ImageData,
  ChatHistory,
  LLMErrorType,
} from '../types.js';
import { LLMError } from '../types.js';
import {
  formatVideoAnalysisPrompt,
  formatReplyGenerationPrompt,
  formatSparkMessagePrompt,
} from '../prompts.js';

// 默认配置
const DEFAULT_TIMEOUT = 60000; // 60秒
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_MAX_TOKENS = 1024;
const INITIAL_RETRY_DELAY = 1000; // 1秒
const MAX_RETRY_DELAY = 10000; // 10秒

/**
 * 基础 LLM Provider 抽象类
 */
export abstract class BaseLLMProvider implements LLMProvider {
  abstract readonly name: AIProviderType;
  abstract readonly capabilities: LLMCapabilities;
  abstract readonly model: string;

  protected config: BaseLLMConfig;
  protected totalTokenUsage: TokenUsage = { input: 0, output: 0, total: 0 };

  constructor(config: BaseLLMConfig = {}) {
    this.config = {
      mockMode: config.mockMode ?? false,
      timeout: config.timeout ?? DEFAULT_TIMEOUT,
      maxRetries: config.maxRetries ?? DEFAULT_MAX_RETRIES,
      maxTokens: config.maxTokens ?? DEFAULT_MAX_TOKENS,
    };
  }

  // 抽象方法 - 子类必须实现
  abstract analyzeVideo(
    screenshots: ImageData[],
    videoInfo: VideoInfo
  ): Promise<{ analysis: VideoAnalysis; tokens: TokenUsage }>;

  abstract generateReply(
    analysis: VideoAnalysis,
    style: ReplyStyle,
    maxLength?: number,
    chatHistory?: ChatHistory
  ): Promise<{ reply: string; tokens: TokenUsage }>;

  abstract generateSparkMessage(
    friendName: string,
    recentMessages?: string[]
  ): Promise<{ message: string; tokens: TokenUsage }>;

  abstract isAvailable(): boolean;

  /**
   * 发送消息给 LLM（子类实现具体逻辑）
   */
  protected abstract sendMessage(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string | unknown }>,
    maxTokens?: number
  ): Promise<{ content: string; tokens: TokenUsage }>;

  /**
   * 检测是否支持 Vision
   */
  protected checkVisionSupport(): void {
    if (!this.capabilities.vision) {
      throw new LLMError(
        'MODEL_UNAVAILABLE' as LLMErrorType,
        `Provider ${this.name} does not support vision capability`
      );
    }
  }

  /**
   * 构建视频分析消息
   */
  protected buildVideoAnalysisMessages(
    screenshots: ImageData[],
    videoInfo: VideoInfo
  ): Array<{ role: 'user' | 'assistant' | 'system'; content: unknown }> {
    const prompt = formatVideoAnalysisPrompt(videoInfo);

    // 如果支持 Vision，构建多模态消息
    if (this.capabilities.vision && screenshots.length > 0) {
      const content: unknown[] = screenshots.map((img) => ({
        type: 'image',
        image: this.encodeImage(img),
        mimeType: img.mimeType,
      }));
      content.push({ type: 'text', text: prompt });

      return [{ role: 'user' as const, content }];
    }

    // 不支持 Vision，仅使用文本
    return [{ role: 'user' as const, content: prompt }];
  }

  /**
   * 构建回复生成消息
   */
  protected buildReplyMessages(
    analysis: VideoAnalysis,
    style: ReplyStyle,
    maxLength: number,
    chatHistory?: ChatHistory
  ): Array<{ role: 'user' | 'assistant' | 'system'; content: string }> {
    const prompt = formatReplyGenerationPrompt(
      analysis,
      style,
      maxLength,
      chatHistory?.map((m) => `${m.role}: ${m.content}`).join('\n')
    );

    const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];

    // 添加历史消息
    if (chatHistory && chatHistory.length > 0) {
      messages.push(...chatHistory);
    }

    messages.push({ role: 'user', content: prompt });
    return messages;
  }

  /**
   * 构建火花消息
   */
  protected buildSparkMessages(
    friendName: string,
    recentMessages?: string[]
  ): Array<{ role: 'user' | 'assistant' | 'system'; content: string }> {
    const prompt = formatSparkMessagePrompt(friendName, recentMessages);
    return [{ role: 'user', content: prompt }];
  }

  /**
   * 编码图片为 base64
   */
  protected encodeImage(img: ImageData): string {
    return img.buffer.toString('base64');
  }

  /**
   * 解析视频分析结果
   */
  protected parseAnalysisResult(text: string): VideoAnalysis {
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
   * 带重试的请求执行
   */
  protected async withRetry<T>(
    fn: () => Promise<T>,
    attempt: number = 1
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      const llmError = this.normalizeError(error);
      const isRetryable = this.isRetryableError(llmError);
      const isLastAttempt = attempt >= (this.config.maxRetries ?? DEFAULT_MAX_RETRIES);

      if (!isRetryable || isLastAttempt) {
        throw llmError;
      }

      // 指数退避
      const delay = Math.min(
        INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1),
        MAX_RETRY_DELAY
      );

      await this.sleep(delay);
      return this.withRetry(fn, attempt + 1);
    }
  }

  /**
   * 规范化错误
   */
  protected normalizeError(error: unknown): LLMError {
    if (error instanceof LLMError) {
      return error;
    }

    const message = error instanceof Error ? error.message : String(error);
    const lowerMessage = message.toLowerCase();

    // 根据错误信息判断类型
    if (lowerMessage.includes('api key') || lowerMessage.includes('unauthorized')) {
      return new LLMError('INVALID_API_KEY' as LLMErrorType, message, error);
    }
    if (lowerMessage.includes('timeout')) {
      return new LLMError('TIMEOUT' as LLMErrorType, message, error);
    }
    if (lowerMessage.includes('rate limit') || lowerMessage.includes('429')) {
      return new LLMError('RATE_LIMIT' as LLMErrorType, message, error);
    }
    if (lowerMessage.includes('model') && lowerMessage.includes('not found')) {
      return new LLMError('MODEL_UNAVAILABLE' as LLMErrorType, message, error);
    }
    if (lowerMessage.includes('content filter') || lowerMessage.includes('safety')) {
      return new LLMError('CONTENT_FILTER' as LLMErrorType, message, error);
    }
    if (lowerMessage.includes('network') || lowerMessage.includes('econn')) {
      return new LLMError('NETWORK_ERROR' as LLMErrorType, message, error);
    }

    return new LLMError('UNKNOWN' as LLMErrorType, message, error);
  }

  /**
   * 判断是否为可重试的错误
   */
  protected isRetryableError(error: LLMError): boolean {
    const retryableTypes = ['RATE_LIMIT', 'TIMEOUT', 'NETWORK_ERROR', 'UNKNOWN'];
    return retryableTypes.includes(error.type);
  }

  /**
   * 更新 Token 使用统计
   */
  protected updateTokenUsage(tokens: TokenUsage): void {
    this.totalTokenUsage.input += tokens.input;
    this.totalTokenUsage.output += tokens.output;
    this.totalTokenUsage.total += tokens.total;
  }

  /**
   * Sleep 工具函数
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 获取 Token 使用统计
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
   * 检测图片媒体类型
   */
  protected detectMediaType(buffer: Buffer): ImageData['mimeType'] {
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
   * 将 Buffer 数组转换为 ImageData 数组
   */
  protected buffersToImageData(buffers: Buffer[]): ImageData[] {
    return buffers.map((buffer) => ({
      buffer,
      mimeType: this.detectMediaType(buffer),
    }));
  }
}
