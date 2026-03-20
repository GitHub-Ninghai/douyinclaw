/**
 * LLM Provider 工厂
 * 根据配置动态创建和切换 Provider
 */

import type { LLMProvider, AIProviderType, LLMConfig, ClaudeConfig, GLMConfig, QwenConfig, MiniMaxConfig } from './types.js';
import { ClaudeProvider, createClaudeProvider } from './providers/claude.js';
import { GLMProvider, createGLMProvider } from './providers/glm.js';
import { QwenProvider, createQwenProvider } from './providers/qwen.js';
import { MiniMaxProvider, createMiniMaxProvider } from './providers/minimax.js';

/**
 * Provider 创建函数类型
 */
type ProviderFactory<T extends LLMConfig = LLMConfig> = (config?: Partial<T>) => LLMProvider;

/**
 * Provider 工厂映射
 */
const providerFactories: Record<AIProviderType, ProviderFactory> = {
  claude: (config) => createClaudeProvider(config as Partial<ClaudeConfig>),
  glm: (config) => createGLMProvider(config as Partial<GLMConfig>),
  qwen: (config) => createQwenProvider(config as Partial<QwenConfig>),
  minimax: (config) => createMiniMaxProvider(config as Partial<MiniMaxConfig>),
};

/**
 * 当前活跃的 Provider 实例
 */
let currentProvider: LLMProvider | null = null;

/**
 * 当前 Provider 类型
 */
let currentProviderType: AIProviderType | null = null;

/**
 * 从环境变量获取默认 Provider 类型
 */
function getDefaultProviderType(): AIProviderType {
  const envProvider = process.env.AI_PROVIDER?.toLowerCase() as AIProviderType;
  const validProviders: AIProviderType[] = ['claude', 'glm', 'qwen', 'minimax'];

  if (envProvider && validProviders.includes(envProvider)) {
    return envProvider;
  }

  // 默认使用 Claude
  return 'claude';
}

/**
 * 创建 Provider 实例
 */
export function createProvider(config: LLMConfig): LLMProvider {
  const factory = providerFactories[config.provider];

  if (!factory) {
    throw new Error(`Unknown provider type: ${config.provider}`);
  }

  return factory(config as Parameters<typeof factory>[0]);
}

/**
 * 获取或创建 Provider 实例（单例模式）
 * @param providerType Provider 类型（可选，默认从环境变量读取）
 * @param config Provider 配置（可选）
 * @param forceCreate 是否强制创建新实例
 */
export function getProvider(
  providerType?: AIProviderType,
  config?: Partial<LLMConfig>,
  forceCreate: boolean = false
): LLMProvider {
  const type = providerType ?? getDefaultProviderType();

  // 如果类型相同且不强制创建，返回现有实例
  if (!forceCreate && currentProvider && currentProviderType === type) {
    return currentProvider;
  }

  // 创建新实例
  const fullConfig = { ...config, provider: type } as LLMConfig;
  currentProvider = createProvider(fullConfig);
  currentProviderType = type;

  return currentProvider;
}

/**
 * 切换 Provider
 * @param providerType 新的 Provider 类型
 * @param config Provider 配置（可选）
 */
export function switchProvider(
  providerType: AIProviderType,
  config?: Partial<LLMConfig>
): LLMProvider {
  return getProvider(providerType, config, true);
}

/**
 * 获取当前 Provider 类型
 */
export function getCurrentProviderType(): AIProviderType | null {
  return currentProviderType;
}

/**
 * 获取所有支持的 Provider 类型
 */
export function getSupportedProviders(): AIProviderType[] {
  return Object.keys(providerFactories) as AIProviderType[];
}

/**
 * 检查 Provider 是否可用
 */
export function isProviderAvailable(providerType: AIProviderType): boolean {
  try {
    const provider = createProvider({ provider: providerType } as LLMConfig);
    return provider.isAvailable();
  } catch {
    return false;
  }
}

/**
 * 重置 Provider 实例（用于测试）
 */
export function resetProvider(): void {
  currentProvider = null;
  currentProviderType = null;
}

// 导出所有 Provider 类和创建函数
export {
  ClaudeProvider,
  createClaudeProvider,
  GLMProvider,
  createGLMProvider,
  QwenProvider,
  createQwenProvider,
  MiniMaxProvider,
  createMiniMaxProvider,
};
