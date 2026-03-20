/**
 * 设置服务
 */

import type { AppSettings, LLMProviderInfo } from '@douyinclaw/shared';

// 默认设置
const defaultSettings: AppSettings = {
  sparkCron1: '0 8 * * *',
  sparkCron2: '0 20 * * *',
  messageCheckInterval: 30000,
  sessionHeartbeatInterval: 60000,
  aiProvider: 'glm',
  aiModel: 'glm-4',
  aiMaxTokens: 1000,
  feishuEnabled: false,
  feishuNotifyOnSpark: true,
  feishuNotifyOnReply: true,
  feishuNotifyOnError: true,
  autoReplyEnabled: true,
  replyRequireApproval: true,
};

// 设置存储（实际项目中应使用数据库）
let currentSettings: AppSettings = { ...defaultSettings };

// 可用的 AI 提供商列表
const availableProviders: LLMProviderInfo[] = [
  {
    name: 'Claude',
    type: 'claude',
    supportsVision: true,
    models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
    defaultModel: 'claude-3-sonnet',
  },
  {
    name: 'GLM',
    type: 'glm',
    supportsVision: true,
    models: ['glm-4', 'glm-4-plus', 'glm-3-turbo'],
    defaultModel: 'glm-4',
  },
  {
    name: 'Qwen',
    type: 'qwen',
    supportsVision: true,
    models: ['qwen-turbo', 'qwen-plus', 'qwen-max'],
    defaultModel: 'qwen-plus',
  },
  {
    name: 'MiniMax',
    type: 'minimax',
    supportsVision: false,
    models: ['abab5.5-chat', 'abab5.5-api'],
    defaultModel: 'abab5.5-chat',
  },
];

/**
 * 获取所有设置
 */
export async function getSettings(): Promise<AppSettings> {
  return { ...currentSettings };
}

/**
 * 更新设置
 */
export async function updateSettings(data: Partial<AppSettings>): Promise<AppSettings> {
  currentSettings = {
    ...currentSettings,
    ...data,
  };
  return { ...currentSettings };
}

/**
 * 获取可用的 AI 提供商列表
 */
export async function getAIProviders(): Promise<LLMProviderInfo[]> {
  return [...availableProviders];
}

/**
 * 重置设置为默认值
 */
export async function resetSettings(): Promise<AppSettings> {
  currentSettings = { ...defaultSettings };
  return { ...currentSettings };
}

/**
 * 获取特定设置项
 */
export async function getSetting<K extends keyof AppSettings>(
  key: K
): Promise<AppSettings[K]> {
  return currentSettings[key];
}
