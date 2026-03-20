/**
 * AI 模块统一类型定义
 * 支持多款 LLM Provider
 */

import type { VideoInfo, VideoAnalysis, ReplyStyle } from '@douyinclaw/shared';

/**
 * 支持的 AI Provider 类型
 */
export type AIProviderType = 'claude' | 'glm' | 'qwen' | 'minimax';

/**
 * Token 使用统计
 */
export interface TokenUsage {
  input: number;
  output: number;
  total: number;
}

/**
 * 聊天历史消息
 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * 聊天历史
 */
export type ChatHistory = ChatMessage[];

/**
 * 图片数据
 */
export interface ImageData {
  buffer: Buffer;
  mimeType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
}

/**
 * LLM Provider 能力
 */
export interface LLMCapabilities {
  /** 是否支持 Vision（图片输入） */
  vision: boolean;
  /** 是否支持流式输出 */
  streaming: boolean;
  /** 最大上下文长度 */
  maxContextLength: number;
  /** 支持的图片格式 */
  supportedImageFormats?: string[];
}

/**
 * LLM Provider 配置基类
 */
export interface BaseLLMConfig {
  /** 是否启用 Mock 模式 */
  mockMode?: boolean;
  /** 请求超时时间（毫秒） */
  timeout?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 最大输出 token 数 */
  maxTokens?: number;
}

/**
 * Claude 配置
 */
export interface ClaudeConfig extends BaseLLMConfig {
  provider: 'claude';
  apiKey?: string;
  model?: string;
}

/**
 * GLM (智谱 AI) 配置
 */
export interface GLMConfig extends BaseLLMConfig {
  provider: 'glm';
  apiKey?: string;
  model?: string;
  /** API 基础 URL */
  baseUrl?: string;
}

/**
 * Qwen (通义千问) 配置
 */
export interface QwenConfig extends BaseLLMConfig {
  provider: 'qwen';
  apiKey?: string;
  model?: string;
  /** API 基础 URL */
  baseUrl?: string;
}

/**
 * MiniMax 配置
 */
export interface MiniMaxConfig extends BaseLLMConfig {
  provider: 'minimax';
  apiKey?: string;
  groupId?: string;
  model?: string;
  /** API 基础 URL */
  baseUrl?: string;
}

/**
 * 统一 LLM 配置
 */
export type LLMConfig = ClaudeConfig | GLMConfig | QwenConfig | MiniMaxConfig;

/**
 * LLM Provider 接口
 * 所有 Provider 必须实现此接口
 */
export interface LLMProvider {
  /** Provider 名称 */
  readonly name: AIProviderType;

  /** Provider 能力 */
  readonly capabilities: LLMCapabilities;

  /** 当前使用的模型 */
  readonly model: string;

  /**
   * 分析视频内容
   * @param screenshots 视频截图
   * @param videoInfo 视频信息
   */
  analyzeVideo(
    screenshots: ImageData[],
    videoInfo: VideoInfo
  ): Promise<{ analysis: VideoAnalysis; tokens: TokenUsage }>;

  /**
   * 生成回复
   * @param analysis 视频分析结果
   * @param style 回复风格
   * @param maxLength 最大长度
   * @param chatHistory 聊天历史（可选）
   */
  generateReply(
    analysis: VideoAnalysis,
    style: ReplyStyle,
    maxLength?: number,
    chatHistory?: ChatHistory
  ): Promise<{ reply: string; tokens: TokenUsage }>;

  /**
   * 生成火花续命消息
   * @param friendName 朋友名字
   * @param recentMessages 最近发送的消息（避免重复）
   */
  generateSparkMessage(
    friendName: string,
    recentMessages?: string[]
  ): Promise<{ message: string; tokens: TokenUsage }>;

  /**
   * 检查 Provider 是否可用
   */
  isAvailable(): boolean;

  /**
   * 获取 Token 使用统计
   */
  getTokenUsage(): TokenUsage;

  /**
   * 重置 Token 使用统计
   */
  resetTokenUsage(): void;
}

/**
 * LLM 响应结果
 */
export interface LLMResponse<T> {
  data: T;
  tokens: TokenUsage;
  model: string;
  provider: AIProviderType;
}

/**
 * LLM 错误类型
 */
export enum LLMErrorType {
  /** API 密钥无效 */
  INVALID_API_KEY = 'INVALID_API_KEY',
  /** 请求超时 */
  TIMEOUT = 'TIMEOUT',
  /** 速率限制 */
  RATE_LIMIT = 'RATE_LIMIT',
  /** 模型不可用 */
  MODEL_UNAVAILABLE = 'MODEL_UNAVAILABLE',
  /** 内容过滤 */
  CONTENT_FILTER = 'CONTENT_FILTER',
  /** 网络错误 */
  NETWORK_ERROR = 'NETWORK_ERROR',
  /** 未知错误 */
  UNKNOWN = 'UNKNOWN',
}

/**
 * LLM 错误
 */
export class LLMError extends Error {
  constructor(
    public readonly type: LLMErrorType,
    message: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'LLMError';
  }
}
