/**
 * 飞书命令处理器
 */

import type { FeishuCommand, CommandResult, CommandHandler, FeishuEvent } from '../types.js';
import type { SystemStatus } from '@douyinclaw/shared';

/**
 * 命令处理器注册表
 */
const handlers: Map<string, CommandHandler> = new Map();

/**
 * 注册命令处理器
 */
export function registerCommand(command: string, handler: CommandHandler): void {
  handlers.set(command.toLowerCase(), handler);
}

/**
 * 获取命令处理器
 */
export function getCommandHandler(command: string): CommandHandler | undefined {
  return handlers.get(command.toLowerCase());
}

/**
 * 处理命令
 */
export async function handleCommand(
  command: FeishuCommand,
  event: FeishuEvent
): Promise<CommandResult> {
  const handler = getCommandHandler(command.command);

  if (!handler) {
    return {
      success: false,
      message: `未知命令: /${command.command}\n可用命令: /status, /spark, /reply, /help`,
    };
  }

  try {
    return await handler(command, event);
  } catch (error) {
    return {
      success: false,
      message: `命令执行失败: ${(error as Error).message}`,
    };
  }
}

// ==================== 内置命令处理器 ====================

/**
 * /status 命令 - 查看系统状态
 */
registerCommand('status', async (_command: FeishuCommand): Promise<CommandResult> => {
  const status: SystemStatus = {
    loginStatus: 'active',
    todaySpark: {
      success: 0,
      failed: 0,
      total: 0,
    },
    todayReplies: 0,
    uptime: process.uptime(),
  };

  const lines = [
    '系统状态',
    '─────────',
    `登录状态: ${status.loginStatus === 'active' ? '已登录' : '未登录'}`,
    `今日火花: ${status.todaySpark.success}/${status.todaySpark.total}`,
    `今日回复: ${status.todayReplies}`,
    `运行时间: ${Math.floor(status.uptime / 3600)}小时`,
  ];

  return {
    success: true,
    message: lines.join('\n'),
    data: status as unknown as Record<string, unknown>,
  };
});

/**
 * /spark 命令 - 触发火花发送
 */
registerCommand('spark', async (command: FeishuCommand): Promise<CommandResult> => {
  const args = command.args;

  if (args.length === 0) {
    return {
      success: true,
      message: '火花发送任务已加入队列\n使用 /spark now 立即执行',
    };
  }

  const subCommand = args[0]?.toLowerCase();

  if (subCommand === 'now') {
    // 触发立即发送火花
    return {
      success: true,
      message: '正在立即发送火花...',
      data: { action: 'spark_now' },
    };
  }

  if (subCommand === 'status') {
    return {
      success: true,
      message: '火花状态:\n- 上午发送: 08:00\n- 晚间发送: 20:00\n- 今日已发送: 0',
    };
  }

  return {
    success: false,
    message: `未知子命令: ${subCommand}\n用法: /spark [now|status]`,
  };
});

/**
 * /reply 命令 - 管理回复设置
 */
registerCommand('reply', async (command: FeishuCommand): Promise<CommandResult> => {
  const args = command.args;

  if (args.length === 0) {
    return {
      success: true,
      message: '回复设置\n─────────\n自动回复: 开启\n需要审核: 关闭\n\n命令:\n/reply on - 开启自动回复\n/reply off - 关闭自动回复\n/reply approve - 开启审核',
    };
  }

  const subCommand = args[0]?.toLowerCase();

  switch (subCommand) {
    case 'on':
      return {
        success: true,
        message: '自动回复已开启',
        data: { autoReply: true },
      };

    case 'off':
      return {
        success: true,
        message: '自动回复已关闭',
        data: { autoReply: false },
      };

    case 'approve':
    case 'approval':
      return {
        success: true,
        message: '回复审核已开启,每条回复将需要确认后发送',
        data: { requireApproval: true },
      };

    default:
      return {
        success: false,
        message: `未知子命令: ${subCommand}`,
      };
  }
});

/**
 * /ai 命令 - AI 设置
 */
registerCommand('ai', async (command: FeishuCommand): Promise<CommandResult> => {
  const args = command.args;

  if (args.length === 0) {
    return {
      success: true,
      message: 'AI 设置\n─────────\n当前 Provider: Claude\n当前 Model: claude-3-5-sonnet\n\n命令:\n/ai list - 列出可用模型\n/ai switch <provider> - 切换 AI 服务',
    };
  }

  const subCommand = args[0]?.toLowerCase();

  if (subCommand === 'list') {
    return {
      success: true,
      message: '可用 AI 服务:\n- claude (Claude 3.5 Sonnet)\n- glm (GLM-4)\n- qwen (通义千问)\n- minimax (MiniMax)',
    };
  }

  if (subCommand === 'switch' && args[1]) {
    const provider = args[1].toLowerCase();
    const validProviders = ['claude', 'glm', 'qwen', 'minimax'];

    if (!validProviders.includes(provider)) {
      return {
        success: false,
        message: `无效的 AI 服务: ${provider}\n可用: ${validProviders.join(', ')}`,
      };
    }

    return {
      success: true,
      message: `AI 服务已切换到: ${provider}`,
      data: { provider },
    };
  }

  return {
    success: false,
    message: `未知子命令: ${subCommand}`,
  };
});

/**
 * /help 命令 - 显示帮助
 */
registerCommand('help', async (): Promise<CommandResult> => {
  const helpText = `
DouyinClaw 帮助
═══════════════════

可用命令:

/status
  查看系统运行状态

/spark [now|status]
  发送火花消息
  - now: 立即发送
  - status: 查看火花状态

/reply [on|off|approve]
  管理自动回复设置
  - on: 开启自动回复
  - off: 关闭自动回复
  - approve: 开启审核模式

/ai [list|switch]
  AI 服务设置
  - list: 列出可用服务
  - switch <name>: 切换服务

/help
  显示此帮助信息
`.trim();

  return {
    success: true,
    message: helpText,
  };
});

// 导出所有处理器
export { handlers };
