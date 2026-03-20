/**
 * AI Prompt 模板
 */

import type { ReplyStyle, VideoInfo, VideoAnalysis } from '@douyinclaw/shared';

/**
 * 构建视频分析 Prompt
 */
export const VIDEO_ANALYSIS_PROMPT = `你是一个视频内容分析专家。请分析以下视频截图和信息，输出结构化的分析结果。

## 视频信息
- 标题: {{title}}
- 描述: {{description}}
- 作者: {{author}}
- 标签: {{tags}}

请分析视频截图和以上信息，返回以下 JSON 格式的分析结果：
{
  "summary": "视频内容的一句话摘要（20-50字）",
  "mood": "视频的整体氛围/情绪（如：轻松、搞笑、励志、温馨、紧张等）",
  "topics": ["主题1", "主题2", "主题3"],
  "keyElements": ["关键元素1", "关键元素2", "关键元素3"]
}

只返回 JSON，不要有其他文字。`;

/**
 * 构建回复生成 Prompt
 */
export const REPLY_GENERATION_PROMPT = `你是一个擅长社交互动的助手，需要根据视频分析结果生成自然、有趣的回复。

## 视频分析
{{analysis}}

## 回复风格
- 语调: {{tone}}
{{#if persona}}- 人设: {{persona}}{{/if}}
- 最大长度: {{maxLength}} 字

{{#if chatHistory}}
## 聊天上下文
{{chatHistory}}
{{/if}}

请生成一个自然、符合风格的回复。回复应该：
1. 与视频内容相关
2. 体现对分享者的关注
3. 引发进一步的对话

只返回回复文字，不要有其他内容。`;

/**
 * 构建火花续命消息 Prompt
 */
export const SPARK_MESSAGE_PROMPT = `你是一个擅长日常问候的朋友，需要生成一条温馨、不重复的问候消息来维持友谊火花。

## 朋友名字
{{friendName}}

{{#if recentMessages}}
## 最近发送过的消息（请勿重复）
{{recentMessages}}
{{/if}}

请生成一条简短、温馨的日常问候消息（10-30字）。要求：
1. 自然、不做作
2. 避免与最近消息重复
3. 可以包含：天气、日常、关心、分享等话题

只返回消息文字，不要有其他内容。`;

/**
 * 格式化视频分析 Prompt
 */
export function formatVideoAnalysisPrompt(videoInfo: VideoInfo): string {
  return VIDEO_ANALYSIS_PROMPT
    .replace('{{title}}', videoInfo.title || '未知')
    .replace('{{description}}', videoInfo.description || '无描述')
    .replace('{{author}}', videoInfo.author || '未知作者')
    .replace('{{tags}}', videoInfo.tags?.join(', ') || '无标签');
}

/**
 * 格式化回复生成 Prompt
 * @param analysis 视频分析结果
 * @param style 回复风格
 * @param maxLength 最大长度
 * @param chatHistory 聊天历史（已格式化的字符串，或 ChatHistory 数组）
 */
export function formatReplyGenerationPrompt(
  analysis: VideoAnalysis,
  style: ReplyStyle,
  maxLength: number = 100,
  chatHistory?: string
): string {
  const analysisText = JSON.stringify(analysis, null, 2);

  let prompt = REPLY_GENERATION_PROMPT
    .replace('{{analysis}}', analysisText)
    .replace('{{tone}}', getToneDescription(style.tone))
    .replace('{{maxLength}}', String(maxLength));

  // 处理可选的人设
  if (style.persona) {
    prompt = prompt.replace('{{#if persona}}- 人设: {{persona}}{{/if}}', `- 人设: ${style.persona}`);
  } else {
    prompt = prompt.replace('{{#if persona}}- 人设: {{persona}}{{/if}}', '');
  }

  // 处理可选的聊天历史
  if (chatHistory) {
    prompt = prompt.replace(
      '{{#if chatHistory}}\n## 聊天上下文\n{{chatHistory}}\n{{/if}}',
      `\n## 聊天上下文\n${chatHistory}`
    );
  } else {
    prompt = prompt.replace(
      '{{#if chatHistory}}\n## 聊天上下文\n{{chatHistory}}\n{{/if}}',
      ''
    );
  }

  return prompt;
}

/**
 * 格式化火花消息 Prompt
 */
export function formatSparkMessagePrompt(
  friendName: string,
  recentMessages?: string[]
): string {
  let prompt = SPARK_MESSAGE_PROMPT.replace('{{friendName}}', friendName);

  if (recentMessages && recentMessages.length > 0) {
    const recentText = recentMessages.map((m, i) => `${i + 1}. ${m}`).join('\n');
    prompt = prompt.replace(
      '{{#if recentMessages}}\n## 最近发送过的消息（请勿重复）\n{{recentMessages}}\n{{/if}}',
      `\n## 最近发送过的消息（请勿重复）\n${recentText}`
    );
  } else {
    prompt = prompt.replace(
      '{{#if recentMessages}}\n## 最近发送过的消息（请勿重复）\n{{recentMessages}}\n{{/if}}',
      ''
    );
  }

  return prompt;
}

/**
 * 获取语调描述
 */
function getToneDescription(tone: ReplyStyle['tone']): string {
  const descriptions: Record<ReplyStyle['tone'], string> = {
    casual: '日常随意，像朋友聊天一样自然',
    humorous: '幽默风趣，带点调侃和玩笑',
    analytical: '理性分析，有条理地讨论内容',
    brief: '简洁明了，言简意赅'
  };
  return descriptions[tone] || descriptions.casual;
}
