/**
 * @douyinclaw/feishu - 飞书机器人
 *
 * 提供飞书机器人集成功能:
 * - 接收和处理飞书消息
 * - 发送通知到飞书
 * - 命令处理 (/status, /spark, /reply 等)
 */

// 导出核心类
export { FeishuBot, validateFeishuConfig } from './bot.js';

// 导出命令处理器
export {
  handleCommand,
  registerCommand,
  getCommandHandler,
} from './handlers/index.js';

// 导出类型
export type {
  FeishuBotConfig,
  FeishuEvent,
  FeishuEventData,
  FeishuSender,
  FeishuMessage,
  FeishuApiResponse,
  FeishuTokenResponse,
  FeishuSendMessageRequest,
  FeishuTextContent,
  FeishuPostContent,
  FeishuPostSection,
  FeishuBotCallbacks,
  CommandResult,
  CommandHandler,
} from './types.js';

// 重新导出共享类型
export type { FeishuNotification, FeishuCommand } from './types.js';

/**
 * 创建飞书机器人实例
 */
import { FeishuBot } from './bot.js';
import type { FeishuBotConfig, FeishuBotCallbacks } from './types.js';

export function createFeishuBot(
  config: FeishuBotConfig,
  callbacks?: FeishuBotCallbacks
): FeishuBot {
  return new FeishuBot(config, callbacks);
}
