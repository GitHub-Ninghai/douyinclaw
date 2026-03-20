/**
 * GLM (智谱 AI) LLM Provider
 * 支持 GLM-4V 等 Vision 模型
 */

import type { VideoInfo, VideoAnalysis, ReplyStyle } from '@douyinclaw/shared';
import type { GLMConfig, TokenUsage, ImageData, ChatHistory, LLMCapabilities } from '../types.js';
import { LLMError } from '../types.js';
import { BaseLLMProvider } from './base.js';

// GLM 默认配置
const DEFAULT_MODEL = 'glm-4v-flash'; // 支持视觉的免费模型
const DEFAULT_BASE_URL = 'https://open.bigmodel.cn/api/paas/v4';

/**
 * GLM Provider 能力
 */
const GLM_CAPABILITIES: LLMCapabilities = {
  vision: true,
  streaming: true,
  maxContextLength: 128000,
  supportedImageFormats: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
};

/**
 * GLM API 响应类型
 */
interface GLMResponse {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * GLM Provider 实现
 */
export class GLMProvider extends BaseLLMProvider {
  readonly name = 'glm' as const;
  readonly capabilities = GLM_CAPABILITIES;

  private apiKey: string | undefined;
  private baseUrl: string;
  private _model: string;

  constructor(config: GLMConfig = { provider: 'glm' }) {
    super(config);

    this.apiKey = config.apiKey ?? process.env.GLM_API_KEY;
    this.baseUrl = config.baseUrl ?? process.env.GLM_BASE_URL ?? DEFAULT_BASE_URL;
    this._model = config.model ?? process.env.GLM_MODEL ?? DEFAULT_MODEL;
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
    if (this.config.mockMode || !this.apiKey) {
      return this.mockAnalyzeVideo(videoInfo);
    }

    return this.withRetry(async () => {
      const prompt = this.buildVideoAnalysisPrompt(videoInfo);

      // 构建多模态消息
      const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];

      // 添加图片
      for (const img of screenshots) {
        content.push({
          type: 'image_url',
          image_url: {
            url: `data:${img.mimeType};base64,${this.encodeImage(img)}`,
          },
        });
      }

      // 添加文本
      content.push({
        type: 'text',
        text: prompt,
      });

      const response = await this.callAPI([
        {
          role: 'user',
          content,
        },
      ]);

      const analysis = this.parseAnalysisResult(response.choices[0]?.message?.content ?? '');
      const tokens: TokenUsage = {
        input: response.usage.prompt_tokens,
        output: response.usage.completion_tokens,
        total: response.usage.total_tokens,
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
    if (this.config.mockMode || !this.apiKey) {
      return this.mockGenerateReply(analysis, style);
    }

    return this.withRetry(async () => {
      const prompt = this.buildReplyGenerationPrompt(analysis, style, maxLength, chatHistory);
      const messages: Array<{ role: string; content: string }> = [];

      if (chatHistory && chatHistory.length > 0) {
        messages.push(...chatHistory.map((m) => ({ role: m.role, content: m.content })));
      }

      messages.push({ role: 'user', content: prompt });

      const response = await this.callAPI(messages);

      const reply = response.choices[0]?.message?.content ?? '';
      const tokens: TokenUsage = {
        input: response.usage.prompt_tokens,
        output: response.usage.completion_tokens,
        total: response.usage.total_tokens,
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
    if (this.config.mockMode || !this.apiKey) {
      return this.mockGenerateSparkMessage(friendName);
    }

    return this.withRetry(async () => {
      const prompt = this.buildSparkMessagePrompt(friendName, recentMessages);

      const response = await this.callAPI([{ role: 'user', content: prompt }]);

      const message = response.choices[0]?.message?.content ?? '';
      const tokens: TokenUsage = {
        input: response.usage.prompt_tokens,
        output: response.usage.completion_tokens,
        total: response.usage.total_tokens,
      };

      this.updateTokenUsage(tokens);
      return { message, tokens };
    });
  }

  /**
   * 检查 Provider 是否可用
   */
  isAvailable(): boolean {
    return this.config.mockMode || !!this.apiKey;
  }

  /**
   * 发送消息（实现基类抽象方法）
   */
  protected async sendMessage(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string | unknown }>,
    maxTokens?: number
  ): Promise<{ content: string; tokens: TokenUsage }> {
    const formattedMessages = messages.map((m) => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
    }));

    const response = await this.callAPI(formattedMessages, maxTokens);

    return {
      content: response.choices[0]?.message?.content ?? '',
      tokens: {
        input: response.usage.prompt_tokens,
        output: response.usage.completion_tokens,
        total: response.usage.total_tokens,
      },
    };
  }

  /**
   * 调用 GLM API
   */
  private async callAPI(
    messages: Array<{ role: string; content: unknown }>,
    maxTokens?: number
  ): Promise<GLMResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this._model,
        messages,
        max_tokens: maxTokens ?? this.config.maxTokens,
      }),
      signal: AbortSignal.timeout(this.config.timeout!),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new LLMError(
        'UNKNOWN' as never,
        `GLM API error: ${response.status} ${errorText}`,
        new Error(errorText)
      );
    }

    return response.json() as Promise<GLMResponse>;
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

请生成一个自然、符合风格的回复。只返回回复文字。`;

    return prompt;
  }

  private buildSparkMessagePrompt(friendName: string, recentMessages?: string[]): string {
    let prompt = `你是一个擅长日常问候的朋友，需要生成一条温馨、不重复的问候消息。

## 朋友名字
${friendName}`;

    if (recentMessages && recentMessages.length > 0) {
      prompt += `\n\n## 最近发送过的消息（请勿重复）\n${recentMessages.map((m, i) => `${i + 1}. ${m}`).join('\n')}`;
    }

    prompt += `

请生成一条简短、温馨的日常问候消息（10-30字）。只返回消息文字。`;

    return prompt;
  }

  // ==================== Mock 方法 ====================

  private mockAnalyzeVideo(videoInfo: VideoInfo): { analysis: VideoAnalysis; tokens: TokenUsage } {
    return {
      analysis: {
        summary: `[GLM] 这是一个关于${videoInfo.title || '未知内容'}的视频`,
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
      casual: `[GLM] 这个视频挺有意思的，${analysis.summary}`,
      humorous: `[GLM] 哈哈，这个视频绝了！${analysis.summary}`,
      analytical: `[GLM] 看了这个视频，我觉得${analysis.summary}`,
      brief: '[GLM] 不错！',
    };

    return {
      reply: replies[style.tone] || replies.casual,
      tokens: { input: 80, output: 30, total: 110 },
    };
  }

  private mockGenerateSparkMessage(friendName: string): { message: string; tokens: TokenUsage } {
    const messages = [
      `[GLM] ${friendName}，今天怎么样？`,
      `[GLM] 嘿 ${friendName}，最近忙啥呢？`,
      `[GLM] ${friendName}，天气不错哦`,
    ];

    const randomMessage = messages[Math.floor(Math.random() * messages.length)] ?? messages[0]!;

    return {
      message: randomMessage,
      tokens: { input: 50, output: 20, total: 70 },
    };
  }
}

/**
 * 创建 GLM Provider 实例
 */
export function createGLMProvider(config?: Partial<GLMConfig>): GLMProvider {
  return new GLMProvider({ provider: 'glm', ...config });
}
