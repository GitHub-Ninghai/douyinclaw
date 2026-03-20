/**
 * 飞书机器人核心实现
 */

import type {
  FeishuBotConfig,
  FeishuEvent,
  FeishuNotification,
  FeishuApiResponse,
  FeishuTokenResponse,
  FeishuSendMessageRequest,
  FeishuTextContent,
  FeishuPostContent,
  FeishuPostSection,
  FeishuBotCallbacks,
  FeishuCommand,
} from './types.js';

/**
 * 飞书机器人
 */
export class FeishuBot {
  private config: FeishuBotConfig;
  private callbacks: FeishuBotCallbacks;
  private accessToken: string | null = null;
  private tokenExpireAt: number = 0;

  constructor(config: FeishuBotConfig, callbacks: FeishuBotCallbacks = {}) {
    this.config = config;
    this.callbacks = callbacks;
  }

  /**
   * 获取飞书 API 访问令牌
   */
  private async getAccessToken(): Promise<string> {
    // 如果令牌未过期,直接返回
    if (this.accessToken && Date.now() < this.tokenExpireAt) {
      return this.accessToken;
    }

    const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id: this.config.appId,
        app_secret: this.config.appSecret,
      }),
    });

    const result = (await response.json()) as FeishuApiResponse<FeishuTokenResponse>;

    if (result.code !== 0) {
      throw new Error(`获取飞书访问令牌失败: ${result.msg}`);
    }

    this.accessToken = result.data!.app_access_token;
    // 提前 5 分钟过期
    this.tokenExpireAt = Date.now() + (result.data!.expire - 300) * 1000;

    return this.accessToken;
  }

  /**
   * 验证事件请求
   */
  verifyRequest(_timestamp: string, _nonce: string, _signature: string, _body: string): boolean {
    if (!this.config.verifyToken) {
      return true; // 未配置验证时默认通过
    }

    // 简化验证: 实际生产环境应使用 crypto 进行签名验证
    return this.config.verifyToken.length > 0;
  }

  /**
   * 处理飞书事件
   */
  async handleEvent(event: FeishuEvent): Promise<void> {
    try {
      // 处理 URL 验证
      if (event.type === 'url_verification') {
        return;
      }

      // 处理消息事件
      if (event.type === 'event_callback' && event.event?.message) {
        await this.handleMessageEvent(event);
      }
    } catch (error) {
      this.callbacks.onError?.(error as Error, 'handleEvent');
    }
  }

  /**
   * 处理消息事件
   */
  private async handleMessageEvent(event: FeishuEvent): Promise<void> {
    const { sender, message, chat_type } = event.event;

    if (!message || message.msg_type !== 'text') {
      return;
    }

    // 解析消息内容
    let content: FeishuTextContent;
    try {
      content = JSON.parse(message.content);
    } catch {
      content = { text: message.content };
    }

    const text = content.text.trim();

    // 检查是否是命令 (以 / 开头)
    if (text.startsWith('/')) {
      const command = this.parseCommand(text, sender.sender_id.open_id);

      if (this.callbacks.onCommand) {
        const result = await this.callbacks.onCommand(command, event);

        // 发送回复
        if (chat_type === 'p2p') {
          await this.sendTextMessage(sender.sender_id.open_id, result.message);
        } else if (message.chat_id) {
          await this.sendTextMessage(message.chat_id, result.message, 'chat_id');
        }
      }
    }
  }

  /**
   * 解析命令
   */
  private parseCommand(text: string, fromUser: string): FeishuCommand {
    const parts = text.slice(1).split(/\s+/);
    const command = parts[0]?.toLowerCase() || '';
    const args = parts.slice(1);

    return {
      command,
      args,
      fromUser,
    };
  }

  /**
   * 发送文本消息
   */
  async sendTextMessage(
    receiveId: string,
    text: string,
    receiveIdType: 'open_id' | 'chat_id' | 'user_id' = 'open_id'
  ): Promise<boolean> {
    const token = await this.getAccessToken();

    const content: FeishuTextContent = { text };

    const request: FeishuSendMessageRequest = {
      receive_id: receiveId,
      receive_id_type: receiveIdType,
      msg_type: 'text',
      content: JSON.stringify(content),
    };

    const response = await fetch('https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=' + receiveIdType, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const result = (await response.json()) as FeishuApiResponse;

    if (result.code !== 0) {
      this.callbacks.onError?.(new Error(`发送消息失败: ${result.msg}`), 'sendTextMessage');
      return false;
    }

    return true;
  }

  /**
   * 发送富文本消息
   */
  async sendPostMessage(
    receiveId: string,
    title: string,
    sections: FeishuPostSection[],
    receiveIdType: 'open_id' | 'chat_id' | 'user_id' = 'open_id'
  ): Promise<boolean> {
    const token = await this.getAccessToken();

    const content: FeishuPostContent = {
      zh_cn: {
        title,
        content: [sections],
      },
    };

    const request: FeishuSendMessageRequest = {
      receive_id: receiveId,
      receive_id_type: receiveIdType,
      msg_type: 'post',
      content: JSON.stringify(content),
    };

    const response = await fetch('https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=' + receiveIdType, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const result = (await response.json()) as FeishuApiResponse;

    if (result.code !== 0) {
      this.callbacks.onError?.(new Error(`发送富文本消息失败: ${result.msg}`), 'sendPostMessage');
      return false;
    }

    return true;
  }

  /**
   * 发送通知
   */
  async sendNotification(notification: FeishuNotification): Promise<boolean> {
    this.callbacks.onNotify?.(notification);

    // 优先发送到群聊
    const targetId = this.config.notifyChatId || this.config.notifyOpenId;
    const targetType = this.config.notifyChatId ? 'chat_id' : 'open_id';

    if (!targetId) {
      this.callbacks.onError?.(new Error('未配置飞书通知目标'), 'sendNotification');
      return false;
    }

    // 根据通知类型构建消息
    const title = this.getNotificationTitle(notification);
    const content = this.formatNotificationContent(notification);

    return this.sendPostMessage(targetId, targetType === 'chat_id' ? title : '', content, targetType);
  }

  /**
   * 获取通知标题
   */
  private getNotificationTitle(notification: FeishuNotification): string {
    const titles: Record<string, string> = {
      spark_report: '火花报告',
      reply: '消息回复',
      alert: '系统告警',
      daily_summary: '每日汇总',
    };
    return titles[notification.type] || notification.title;
  }

  /**
   * 格式化通知内容
   */
  private formatNotificationContent(notification: FeishuNotification): FeishuPostSection[] {
    const sections: FeishuPostSection[] = [];

    sections.push({
      tag: 'text',
      text: notification.title + '\n',
    });

    sections.push({
      tag: 'text',
      text: notification.content,
    });

    if (notification.data) {
      sections.push({
        tag: 'text',
        text: '\n详细信息:\n' + JSON.stringify(notification.data, null, 2),
      });
    }

    return sections;
  }

  /**
   * 快捷方法: 发送火花报告
   */
  async sendSparkReport(
    success: number,
    failed: number,
    total: number,
    details?: Array<{ friendName: string; status: string; message?: string }>
  ): Promise<boolean> {
    const notification: FeishuNotification = {
      type: 'spark_report',
      title: '火花发送报告',
      content: `成功: ${success}, 失败: ${failed}, 总计: ${total}`,
      data: {
        success,
        failed,
        total,
        details,
      },
    };

    return this.sendNotification(notification);
  }

  /**
   * 快捷方法: 发送告警
   */
  async sendAlert(title: string, message: string, error?: Error): Promise<boolean> {
    const notification: FeishuNotification = {
      type: 'alert',
      title,
      content: message + (error ? `\n错误: ${error.message}` : ''),
      data: error ? { stack: error.stack } : undefined,
    };

    return this.sendNotification(notification);
  }

  /**
   * 快捷方法: 发送每日汇总
   */
  async sendDailySummary(summary: {
    sparkSuccess: number;
    sparkFailed: number;
    replyCount: number;
    errors: number;
  }): Promise<boolean> {
    const notification: FeishuNotification = {
      type: 'daily_summary',
      title: '每日汇总报告',
      content: `火花: ${summary.sparkSuccess} 成功, ${summary.sparkFailed} 失败\n回复: ${summary.replyCount} 条\n错误: ${summary.errors} 个`,
      data: summary,
    };

    return this.sendNotification(notification);
  }
}

// 导出默认配置验证函数
export function validateFeishuConfig(config: Partial<FeishuBotConfig>): config is FeishuBotConfig {
  return !!(config.appId && config.appSecret);
}
