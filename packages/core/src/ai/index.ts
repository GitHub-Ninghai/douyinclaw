/**
 * AI 模块 - 多模型 LLM 支持
 */

// 类型定义
export type {
  AIProviderType,
  TokenUsage,
  ChatMessage,
  ChatHistory,
  ImageData,
  LLMCapabilities,
  BaseLLMConfig,
  ClaudeConfig,
  GLMConfig,
  QwenConfig,
  MiniMaxConfig,
  LLMConfig,
  LLMProvider,
  LLMResponse,
} from './types.js';

export { LLMError, LLMErrorType } from './types.js';

// Provider 工厂
export {
  createProvider,
  getProvider,
  switchProvider,
  getCurrentProviderType,
  getSupportedProviders,
  isProviderAvailable,
  resetProvider,
  // Provider 类和创建函数
  ClaudeProvider,
  createClaudeProvider,
  GLMProvider,
  createGLMProvider,
  QwenProvider,
  createQwenProvider,
  MiniMaxProvider,
  createMiniMaxProvider,
} from './factory.js';

// Providers
export * from './providers/index.js';

// Prompt 模板
export {
  VIDEO_ANALYSIS_PROMPT,
  REPLY_GENERATION_PROMPT,
  SPARK_MESSAGE_PROMPT,
  formatVideoAnalysisPrompt,
  formatReplyGenerationPrompt,
  formatSparkMessagePrompt,
} from './prompts.js';

// 兼容旧 API - ClaudeService 作为默认 Provider 的包装
import { getProvider, resetProvider } from './factory.js';
import type { VideoInfo, VideoAnalysis, ReplyStyle } from '@douyinclaw/shared';
import type { TokenUsage, ImageData } from './types.js';

/**
 * @deprecated 使用 getProvider() 替代
 * 为向后兼容保留的 ClaudeService 类
 */
export class ClaudeService {
  private provider: ReturnType<typeof getProvider>;

  constructor(config?: { apiKey?: string; model?: string; maxTokens?: number; mockMode?: boolean }) {
    // 使用环境变量或传入的配置
    if (config?.apiKey) {
      process.env.ANTHROPIC_API_KEY = config.apiKey;
    }
    this.provider = getProvider('claude', {
      mockMode: config?.mockMode,
      maxTokens: config?.maxTokens,
    });
  }

  async analyzeVideo(
    screenshots: Buffer[],
    videoInfo: VideoInfo
  ): Promise<{ analysis: VideoAnalysis; tokens: TokenUsage }> {
    const imageData: ImageData[] = screenshots.map((buffer) => ({
      buffer,
      mimeType: this.detectMediaType(buffer),
    }));
    return this.provider.analyzeVideo(imageData, videoInfo);
  }

  async generateReply(
    analysis: VideoAnalysis,
    style: ReplyStyle,
    maxLength: number = 100,
    chatHistory?: string
  ): Promise<{ reply: string; tokens: TokenUsage }> {
    const history = chatHistory ? [{ role: 'user' as const, content: chatHistory }] : undefined;
    return this.provider.generateReply(analysis, style, maxLength, history);
  }

  async generateSparkMessage(
    friendName: string,
    recentMessages?: string[]
  ): Promise<{ message: string; tokens: TokenUsage }> {
    return this.provider.generateSparkMessage(friendName, recentMessages);
  }

  getTokenUsage(): TokenUsage {
    return this.provider.getTokenUsage();
  }

  resetTokenUsage(): void {
    this.provider.resetTokenUsage();
  }

  isAvailable(): boolean {
    return this.provider.isAvailable();
  }

  getModel(): string {
    return this.provider.model;
  }

  private detectMediaType(buffer: Buffer): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' {
    if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'image/png';
    if (buffer[0] === 0xff && buffer[1] === 0xd8) return 'image/jpeg';
    if (buffer[0] === 0x47 && buffer[1] === 0x49) return 'image/gif';
    if (buffer[8] === 0x57 && buffer[9] === 0x45) return 'image/webp';
    return 'image/jpeg';
  }
}

/**
 * @deprecated 使用 getProvider() 替代
 */
export function getClaudeService(config?: ConstructorParameters<typeof ClaudeService>[0]): ClaudeService {
  return new ClaudeService(config);
}

/**
 * @deprecated 使用 resetProvider() 替代
 */
export function resetClaudeService(): void {
  resetProvider();
}
