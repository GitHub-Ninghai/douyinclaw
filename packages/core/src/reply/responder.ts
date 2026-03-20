/**
 * 智能回复器
 * 支持多模型 LLM Provider
 */

import type {
  VideoInfo,
  VideoAnalysis,
  ReplyConfig,
  ReplyResult,
  ReplyStyle,
} from '@douyinclaw/shared';
import { getProvider, type LLMProvider, type AIProviderType, type TokenUsage, type ImageData } from '../ai/index.js';

/**
 * 回复器配置
 */
export interface ResponderConfig {
  /** AI Provider 类型 */
  providerType?: AIProviderType;
  /** 默认回复风格 */
  defaultStyle?: ReplyStyle;
  /** 默认最大长度 */
  defaultMaxLength?: number;
  /** 默认语言 */
  defaultLanguage?: string;
  /** 是否需要审批 */
  defaultRequireApproval?: boolean;
}

/**
 * 默认回复配置
 */
const DEFAULT_REPLY_CONFIG: Partial<ReplyConfig> = {
  maxLength: 100,
  language: 'zh-CN',
  requireApproval: true,
  style: {
    tone: 'casual',
  },
};

/**
 * 智能回复器类
 */
export class Responder {
  private provider: LLMProvider;
  private defaultConfig: Partial<ReplyConfig>;

  constructor(config: ResponderConfig = {}) {
    this.provider = getProvider(config.providerType);
    this.defaultConfig = {
      maxLength: config.defaultMaxLength ?? DEFAULT_REPLY_CONFIG.maxLength,
      language: config.defaultLanguage ?? DEFAULT_REPLY_CONFIG.language,
      requireApproval: config.defaultRequireApproval ?? DEFAULT_REPLY_CONFIG.requireApproval,
      style: config.defaultStyle ?? DEFAULT_REPLY_CONFIG.style,
    };
  }

  /**
   * 处理视频分享，生成智能回复
   * @param videoInfo 视频信息
   * @param screenshots 视频截图
   * @param config 回复配置
   * @param chatHistory 聊天历史（可选）
   */
  async processVideoShare(
    videoInfo: VideoInfo,
    screenshots: Buffer[],
    config?: Partial<ReplyConfig>,
    chatHistory?: string
  ): Promise<ReplyResult> {
    // 合并配置
    const finalConfig: ReplyConfig = {
      style: config?.style ?? this.defaultConfig.style!,
      maxLength: config?.maxLength ?? this.defaultConfig.maxLength!,
      language: config?.language ?? this.defaultConfig.language!,
      requireApproval: config?.requireApproval ?? this.defaultConfig.requireApproval!,
    };

    // 转换截图为 ImageData
    const imageData: ImageData[] = screenshots.map((buffer) => ({
      buffer,
      mimeType: this.detectMediaType(buffer),
    }));

    // 步骤 1: 分析视频
    const { analysis, tokens: analysisTokens } = await this.provider.analyzeVideo(
      imageData,
      videoInfo
    );

    // 步骤 2: 生成回复
    const history = chatHistory ? [{ role: 'user' as const, content: chatHistory }] : undefined;
    const { reply, tokens: replyTokens } = await this.provider.generateReply(
      analysis,
      finalConfig.style,
      finalConfig.maxLength,
      history
    );

    // 步骤 3: 计算置信度
    const confidence = this.calculateConfidence(analysis, reply);

    // 步骤 4: 返回结果
    return {
      reply,
      analysis,
      tokensUsed: {
        input: analysisTokens.input + replyTokens.input,
        output: analysisTokens.output + replyTokens.output,
      },
      confidence,
    };
  }

  /**
   * 仅分析视频（不生成回复）
   */
  async analyzeVideoOnly(
    videoInfo: VideoInfo,
    screenshots: Buffer[]
  ): Promise<{ analysis: VideoAnalysis; tokens: TokenUsage }> {
    const imageData: ImageData[] = screenshots.map((buffer) => ({
      buffer,
      mimeType: this.detectMediaType(buffer),
    }));
    return this.provider.analyzeVideo(imageData, videoInfo);
  }

  /**
   * 仅生成回复（基于已有分析）
   */
  async generateReplyOnly(
    analysis: VideoAnalysis,
    style?: ReplyStyle,
    maxLength?: number,
    chatHistory?: string
  ): Promise<{ reply: string; tokens: TokenUsage }> {
    const finalStyle = style ?? this.defaultConfig.style!;
    const finalMaxLength = maxLength ?? this.defaultConfig.maxLength!;
    const history = chatHistory ? [{ role: 'user' as const, content: chatHistory }] : undefined;

    return this.provider.generateReply(analysis, finalStyle, finalMaxLength, history);
  }

  /**
   * 检查服务是否可用
   */
  isAvailable(): boolean {
    return this.provider.isAvailable();
  }

  /**
   * 获取 Token 使用统计
   */
  getTokenUsage(): TokenUsage {
    return this.provider.getTokenUsage();
  }

  /**
   * 获取当前 Provider 名称
   */
  getProviderName(): string {
    return this.provider.name;
  }

  /**
   * 获取当前模型名称
   */
  getModel(): string {
    return this.provider.model;
  }

  /**
   * 检查是否支持 Vision
   */
  supportsVision(): boolean {
    return this.provider.capabilities.vision;
  }

  /**
   * 计算回复置信度
   * 基于分析质量和回复长度的简单评估
   */
  private calculateConfidence(analysis: VideoAnalysis, reply: string): number {
    let confidence = 0.5; // 基础置信度

    // 分析质量加分
    if (analysis.summary && analysis.summary.length > 10) {
      confidence += 0.1;
    }
    if (analysis.topics && analysis.topics.length > 0) {
      confidence += 0.1;
    }
    if (analysis.keyElements && analysis.keyElements.length > 0) {
      confidence += 0.1;
    }

    // 回复质量加分
    if (reply && reply.length >= 5) {
      confidence += 0.1;
    }
    if (reply && reply.length >= 10) {
      confidence += 0.05;
    }

    // 确保在 0-1 范围内
    return Math.min(Math.max(confidence, 0), 1);
  }

  /**
   * 检测图片媒体类型
   */
  private detectMediaType(buffer: Buffer): ImageData['mimeType'] {
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
}

// 默认导出单例
let defaultResponder: Responder | null = null;

/**
 * 获取默认回复器实例
 */
export function getResponder(config?: ResponderConfig): Responder {
  if (!defaultResponder || config) {
    defaultResponder = new Responder(config);
  }
  return defaultResponder;
}

/**
 * 重置默认回复器实例（用于测试）
 */
export function resetResponder(): void {
  defaultResponder = null;
}

/**
 * 便捷函数：处理视频分享
 */
export async function processVideoShare(
  videoInfo: VideoInfo,
  screenshots: Buffer[],
  config?: Partial<ReplyConfig>,
  chatHistory?: string
): Promise<ReplyResult> {
  return getResponder().processVideoShare(videoInfo, screenshots, config, chatHistory);
}
