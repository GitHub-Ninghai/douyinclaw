/**
 * 消息监听器模块
 * 轮询消息列表，检测未读新消息
 */

import type { ElementHandle } from 'playwright';
import type { Message } from '@douyinclaw/shared';
import { BrowserClient } from '../browser/client.js';
import { douyinSelectors, getAllSelectors } from '../browser/selectors.js';

const LOG_PREFIX = '[MessageMonitor]';

/**
 * 消息监听配置
 */
export interface MonitorConfig {
  /** 轮询间隔 (ms) */
  pollInterval: number;

  /** 每次获取的最大消息数 */
  maxMessagesPerPoll: number;

  /** 是否自动标记已读 */
  autoMarkRead: boolean;
}

const defaultMonitorConfig: MonitorConfig = {
  pollInterval: 5000,
  maxMessagesPerPoll: 20,
  autoMarkRead: false,
};

/**
 * 未读消息信息
 */
export interface UnreadConversation {
  /** 会话 ID（好友名称） */
  name: string;

  /** 未读消息数 */
  unreadCount: number;

  /** 最后一条消息预览 */
  lastMessage?: string;

  /** 是否包含视频分享 */
  hasVideoShare: boolean;
}

/**
 * 消息监听器类
 */
export class MessageMonitor {
  private client: BrowserClient;
  private config: MonitorConfig;
  private isMonitoring: boolean = false;
  private pollTimer: NodeJS.Timeout | null = null;
  private messageCallbacks: Set<(messages: Message[]) => void> = new Set();
  private unreadCallbacks: Set<(unread: UnreadConversation[]) => void> = new Set();

  constructor(client: BrowserClient, config: Partial<MonitorConfig> = {}) {
    this.client = client;
    this.config = { ...defaultMonitorConfig, ...config };
  }

  /**
   * 打开消息页面
   */
  private async ensureMessagePage(): Promise<void> {
    const page = this.client.getPage();
    const currentUrl = page.url();

    if (!currentUrl.includes('message') && !currentUrl.includes('user/self')) {
      // 尝试点击消息图标
      const messageIconConfig = douyinSelectors.message.messageIcon;
      const selectors = getAllSelectors(messageIconConfig);

      for (const selector of selectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            await element.click();
            await page.waitForTimeout(2000);
            return;
          }
        } catch {
          continue;
        }
      }

      // 如果点击失败，直接导航
      await this.client.navigate('https://www.douyin.com/user/self?showTab=message');
      await page.waitForTimeout(2000);
    }
  }

  /**
   * 获取未读会话列表
   */
  async getUnreadConversations(): Promise<UnreadConversation[]> {
    console.log(`${LOG_PREFIX} 正在获取未读会话...`);

    try {
      await this.ensureMessagePage();

      const page = this.client.getPage();
      const unreadList: UnreadConversation[] = [];

      // 获取所有会话项
      const itemConfig = douyinSelectors.message.conversationItem;
      const itemSelectors = getAllSelectors(itemConfig);

      let conversationItems: ElementHandle[] = [];
      for (const selector of itemSelectors) {
        try {
          conversationItems = await page.$$(selector);
          if (conversationItems.length > 0) break;
        } catch {
          continue;
        }
      }

      for (const item of conversationItems) {
        try {
          const unread = await this.extractUnreadInfo(item);
          if (unread && unread.unreadCount > 0) {
            unreadList.push(unread);
          }
        } catch {
          // 忽略单个会话的错误
        }
      }

      console.log(`${LOG_PREFIX} 找到 ${unreadList.length} 个未读会话`);
      return unreadList;
    } catch (error) {
      console.error(`${LOG_PREFIX} 获取未读会话失败:`, error);
      return [];
    }
  }

  /**
   * 从会话元素中提取未读信息
   */
  private async extractUnreadInfo(item: ElementHandle): Promise<UnreadConversation | null> {
    try {
      // 获取未读数量
      const badgeConfig = douyinSelectors.message.unreadBadge;
      const badgeSelectors = getAllSelectors(badgeConfig);

      let unreadCount = 0;
      for (const selector of badgeSelectors) {
        try {
          const badge = await item.$(selector);
          if (badge) {
            const text = (await badge.textContent()) || '0';
            const match = text.match(/(\d+)/);
            if (match) {
              unreadCount = parseInt(match[1]!, 10);
            }
            break;
          }
        } catch {
          continue;
        }
      }

      // 获取好友名称
      const nameConfig = douyinSelectors.spark.friendName;
      const nameSelectors = getAllSelectors(nameConfig);

      let name = '';
      for (const selector of nameSelectors) {
        try {
          const nameEl = await item.$(selector);
          if (nameEl) {
            name = (await nameEl.textContent()) || '';
            if (name) break;
          }
        } catch {
          continue;
        }
      }

      // 获取最后一条消息预览
      const lastMessage = await item.evaluate((el) => {
        // 通常最后一条消息在会话项的底部
        const textNodes: string[] = [];
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
        let node: Node | null;
        while ((node = walker.nextNode())) {
          const text = node.textContent?.trim();
          if (text && text.length > 0) {
            textNodes.push(text);
          }
        }
        // 返回最后几条文本（排除名称）
        return textNodes.slice(-2).join(' ').substring(0, 50);
      });

      // 检查是否包含视频分享
      const hasVideoShare = await this.checkVideoShare(item);

      return {
        name: name.trim(),
        unreadCount,
        lastMessage,
        hasVideoShare,
      };
    } catch {
      return null;
    }
  }

  /**
   * 检查会话是否包含视频分享
   */
  private async checkVideoShare(item: ElementHandle): Promise<boolean> {
    try {
      const videoCardConfig = douyinSelectors.message.videoShareCard;
      const videoSelectors = getAllSelectors(videoCardConfig);

      for (const selector of videoSelectors) {
        try {
          const videoCard = await item.$(selector);
          if (videoCard) {
            return true;
          }
        } catch {
          continue;
        }
      }

      // 备选方案：通过文本检测
      const hasVideoText = await item.evaluate((el) => {
        const text = el.textContent || '';
        return text.includes('分享视频') || text.includes('视频') || text.includes('@');
      });

      return hasVideoText;
    } catch {
      return false;
    }
  }

  /**
   * 打开指定会话并获取消息
   */
  async getMessagesFromConversation(friendName: string): Promise<Message[]> {
    console.log(`${LOG_PREFIX} 获取与 "${friendName}" 的消息...`);

    try {
      const page = this.client.getPage();

      // 打开聊天窗口
      await this.openConversation(friendName);
      await page.waitForTimeout(1000);

      // 获取聊天窗口中的消息
      const messages = await this.extractMessagesFromChat();

      console.log(`${LOG_PREFIX} 获取到 ${messages.length} 条消息`);
      return messages;
    } catch (error) {
      console.error(`${LOG_PREFIX} 获取消息失败:`, error);
      return [];
    }
  }

  /**
   * 打开指定会话
   */
  private async openConversation(friendName: string): Promise<boolean> {
    const page = this.client.getPage();

    // 从会话列表中查找并点击
    const itemConfig = douyinSelectors.message.conversationItem;
    const itemSelectors = getAllSelectors(itemConfig);

    for (const selector of itemSelectors) {
      try {
        const items = await page.$$(selector);

        for (const item of items) {
          const text = await item.textContent();
          if (text && text.includes(friendName)) {
            await item.click();
            await page.waitForTimeout(1000);
            return true;
          }
        }
      } catch {
        continue;
      }
    }

    return false;
  }

  /**
   * 从聊天窗口提取消息
   */
  private async extractMessagesFromChat(): Promise<Message[]> {
    const page = this.client.getPage();
    const messages: Message[] = [];

    try {
      const messageItemConfig = douyinSelectors.message.messageItem;
      const messageSelectors = getAllSelectors(messageItemConfig);

      let messageElements: ElementHandle[] = [];
      for (const selector of messageSelectors) {
        try {
          messageElements = await page.$$(selector);
          if (messageElements.length > 0) break;
        } catch {
          continue;
        }
      }

      for (const element of messageElements) {
        try {
          const message = await this.parseMessageElement(element);
          if (message) {
            messages.push(message);
          }
        } catch {
          // 忽略单条消息的解析错误
        }
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} 提取消息失败:`, error);
    }

    return messages;
  }

  /**
   * 解析消息元素
   */
  private async parseMessageElement(element: ElementHandle): Promise<Message | null> {
    try {
      const info = await element.evaluate((el: Element) => {
        const text = el.textContent || '';

        // 判断消息类型
        let type: 'text' | 'video_share' | 'image' | 'other' = 'text';

        if (el.querySelector('[class*="video"], [class*="share-card"], a[href*="video"]')) {
          type = 'video_share';
        } else if (el.querySelector('img:not([class*="avatar"])')) {
          type = 'image';
        }

        // 判断发送者（简化处理）
        const isSelf = el.classList.contains('self') ||
          el.querySelector('[class*="self"]') !== null;

        return {
          text,
          type,
          isSelf,
        };
      });

      return {
        from: info.isSelf ? 'self' : 'other',
        type: info.type,
        content: info.text.trim(),
        timestamp: new Date(),
      };
    } catch {
      return null;
    }
  }

  /**
   * 开始监控消息
   */
  startMonitoring(callback?: (messages: Message[]) => void): void {
    if (this.isMonitoring) {
      console.log(`${LOG_PREFIX} 已经在监控中`);
      return;
    }

    if (callback) {
      this.messageCallbacks.add(callback);
    }

    console.log(`${LOG_PREFIX} 开始监控消息，间隔: ${this.config.pollInterval}ms`);

    this.isMonitoring = true;
    this.pollTimer = setInterval(async () => {
      try {
        const unread = await this.getUnreadConversations();

        // 对于每个未读会话，获取消息
        for (const conv of unread) {
          const messages = await this.getMessagesFromConversation(conv.name);

          // 通知回调
          for (const cb of this.messageCallbacks) {
            try {
              cb(messages);
            } catch (e) {
              console.error(`${LOG_PREFIX} 回调执行错误:`, e);
            }
          }
        }

        // 通知未读回调
        for (const cb of this.unreadCallbacks) {
          try {
            cb(unread);
          } catch (e) {
            console.error(`${LOG_PREFIX} 未读回调执行错误:`, e);
          }
        }
      } catch (error) {
        console.error(`${LOG_PREFIX} 轮询错误:`, error);
      }
    }, this.config.pollInterval);
  }

  /**
   * 停止监控
   */
  stopMonitoring(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    this.isMonitoring = false;
    console.log(`${LOG_PREFIX} 已停止监控`);
  }

  /**
   * 添加消息回调
   */
  onMessage(callback: (messages: Message[]) => void): void {
    this.messageCallbacks.add(callback);
  }

  /**
   * 添加未读回调
   */
  onUnread(callback: (unread: UnreadConversation[]) => void): void {
    this.unreadCallbacks.add(callback);
  }

  /**
   * 移除回调
   */
  offMessage(callback: (messages: Message[]) => void): void {
    this.messageCallbacks.delete(callback);
  }

  /**
   * 检查是否正在监控
   */
  isActive(): boolean {
    return this.isMonitoring;
  }
}

/**
 * 创建消息监听器实例
 */
export function createMessageMonitor(
  client: BrowserClient,
  config?: Partial<MonitorConfig>
): MessageMonitor {
  return new MessageMonitor(client, config);
}
