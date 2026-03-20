/**
 * 火花保持器模块
 * 对指定好友发送消息以维持火花
 */

import type { SparkFriend, SparkResult } from '@douyinclaw/shared';
import { BrowserClient } from '../browser/client.js';
import { douyinSelectors, getAllSelectors } from '../browser/selectors.js';
import { MessagePool, getRandomSparkContent } from './messages.js';
import { AntiDetect } from '../browser/anti-detect.js';

const LOG_PREFIX = '[SparkKeeper]';

/**
 * 火花保持器配置
 */
export interface SparkKeeperConfig {
  /** 发送消息前是否等待页面加载 */
  waitBeforeSend: number;

  /** 发送后等待时间 */
  waitAfterSend: number;

  /** 最大重试次数 */
  maxRetries: number;

  /** 是否启用防检测延迟 */
  enableAntiDetect: boolean;
}

const defaultConfig: SparkKeeperConfig = {
  waitBeforeSend: 2000,
  waitAfterSend: 3000,
  maxRetries: 3,
  enableAntiDetect: true,
};

/**
 * 发送结果
 */
export interface SendResult {
  success: boolean;
  message?: string;
  error?: string;
  sentAt: Date;
}

/**
 * 火花保持器类
 */
export class SparkKeeper {
  private client: BrowserClient;
  private messagePool: MessagePool;
  private config: SparkKeeperConfig;
  private antiDetect: AntiDetect;

  constructor(
    client: BrowserClient,
    messagePool: MessagePool,
    config: Partial<SparkKeeperConfig> = {}
  ) {
    this.client = client;
    this.messagePool = messagePool;
    this.config = { ...defaultConfig, ...config };
    this.antiDetect = new AntiDetect();
  }

  /**
   * 对单个好友发送消息
   */
  async sendToFriend(friendName: string, customMessage?: string): Promise<SendResult> {
    console.log(`${LOG_PREFIX} 正在向 "${friendName}" 发送消息...`);

    try {
      const page = this.client.getPage();

      // 打开与该好友的聊天窗口
      const opened = await this.openChatWithFriend(friendName);
      if (!opened) {
        return {
          success: false,
          error: `无法打开与 "${friendName}" 的聊天窗口`,
          sentAt: new Date(),
        };
      }

      // 等待页面稳定
      await page.waitForTimeout(this.config.waitBeforeSend);

      // 获取消息内容
      const message = customMessage || getRandomSparkContent(this.messagePool);

      // 发送消息
      const sent = await this.sendMessage(message);

      if (sent) {
        // 等待消息发送完成
        await page.waitForTimeout(this.config.waitAfterSend);

        console.log(`${LOG_PREFIX} 成功向 "${friendName}" 发送消息`);

        return {
          success: true,
          message,
          sentAt: new Date(),
        };
      } else {
        return {
          success: false,
          error: '发送消息失败',
          sentAt: new Date(),
        };
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} 发送消息时出错:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
        sentAt: new Date(),
      };
    }
  }

  /**
   * 打开与指定好友的聊天窗口
   */
  private async openChatWithFriend(friendName: string): Promise<boolean> {
    const page = this.client.getPage();

    try {
      // 方法1: 通过搜索打开聊天
      const searchInputSelectors = [
        'input[placeholder*="搜索"]',
        'input[class*="search"]',
        'div[class*="search"] input',
      ];

      for (const selector of searchInputSelectors) {
        try {
          const searchInput = await page.$(selector);
          if (searchInput) {
            // 点击搜索框
            await searchInput.click();
            await page.waitForTimeout(500);

            // 输入好友名称
            await searchInput.fill(friendName);
            await page.waitForTimeout(1000);

            // 按回车搜索
            await page.keyboard.press('Enter');
            await page.waitForTimeout(1000);

            // 查找并点击好友
            const clicked = await this.clickFriendInSearch(friendName);
            if (clicked) {
              return true;
            }
          }
        } catch {
          continue;
        }
      }

      // 方法2: 从会话列表中查找
      const clicked = await this.clickFriendInConversationList(friendName);
      if (clicked) {
        return true;
      }

      return false;
    } catch (error) {
      console.error(`${LOG_PREFIX} 打开聊天窗口失败:`, error);
      return false;
    }
  }

  /**
   * 从搜索结果中点击好友
   */
  private async clickFriendInSearch(friendName: string): Promise<boolean> {
    const page = this.client.getPage();

    try {
      // 尝试多种选择器
      const resultSelectors = [
        `div[class*="search-result"]:has-text("${friendName}")`,
        `div[class*="user-item"]:has-text("${friendName}")`,
        `div[role="listitem"]:has-text("${friendName}")`,
      ];

      for (const selector of resultSelectors) {
        try {
          const element = await page.waitForSelector(selector, { timeout: 3000 });
          if (element) {
            await element.click();
            await page.waitForTimeout(1000);
            return true;
          }
        } catch {
          continue;
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * 从会话列表中点击好友
   */
  private async clickFriendInConversationList(friendName: string): Promise<boolean> {
    const page = this.client.getPage();

    try {
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
    } catch {
      return false;
    }
  }

  /**
   * 发送消息
   */
  private async sendMessage(message: string): Promise<boolean> {
    const page = this.client.getPage();

    for (let retry = 0; retry < this.config.maxRetries; retry++) {
      try {
        // 查找输入框
        const inputConfig = douyinSelectors.message.chatInput;
        const inputSelectors = getAllSelectors(inputConfig);

        let inputElement = null;
        for (const selector of inputSelectors) {
          try {
            inputElement = await page.waitForSelector(selector, { timeout: 5000 });
            if (inputElement) break;
          } catch {
            continue;
          }
        }

        if (!inputElement) {
          console.log(`${LOG_PREFIX} 未找到输入框，重试 ${retry + 1}/${this.config.maxRetries}`);
          await page.waitForTimeout(1000);
          continue;
        }

        // 聚焦输入框
        await inputElement.click();
        await page.waitForTimeout(300);

        // 清空现有内容
        await inputElement.fill('');

        // 输入消息（使用防检测打字）
        if (this.config.enableAntiDetect) {
          await this.typeWithAntiDetect(inputElement, message);
        } else {
          await inputElement.fill(message);
        }

        // 发送消息
        const sent = await this.pressSendButton();

        if (sent) {
          return true;
        }

        // 如果点击发送按钮失败，尝试按回车
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);

        return true;
      } catch (error) {
        console.error(`${LOG_PREFIX} 发送消息失败，重试 ${retry + 1}/${this.config.maxRetries}:`, error);
        await page.waitForTimeout(1000);
      }
    }

    return false;
  }

  /**
   * 使用防检测方式输入文本
   */
  private async typeWithAntiDetect(
    element: import('playwright').ElementHandle<HTMLElement | SVGElement>,
    text: string
  ): Promise<void> {
    const delays = this.antiDetect.simulateTyping(text);

    for (let i = 0; i < text.length; i++) {
      await element.type(text[i]!, { delay: delays[i]! });
    }
  }

  /**
   * 点击发送按钮
   */
  private async pressSendButton(): Promise<boolean> {
    const page = this.client.getPage();

    try {
      const sendConfig = douyinSelectors.message.sendButton;
      const sendSelectors = getAllSelectors(sendConfig);

      for (const selector of sendSelectors) {
        try {
          const sendBtn = await page.$(selector);
          if (sendBtn) {
            const isEnabled = await sendBtn.isEnabled();
            if (isEnabled) {
              await sendBtn.click();
              return true;
            }
          }
        } catch {
          continue;
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * 批量发送消息给多个好友
   */
  async sendToMultipleFriends(
    friends: SparkFriend[],
    options?: {
      customMessages?: Record<string, string>;
      delayBetweenSends?: number;
    }
  ): Promise<SparkResult[]> {
    console.log(`${LOG_PREFIX} 开始批量发送消息给 ${friends.length} 个好友...`);

    const results: SparkResult[] = [];
    const delay = options?.delayBetweenSends || 5000;

    for (const friend of friends) {
      const customMessage = options?.customMessages?.[friend.friendName];
      const sendResult = await this.sendToFriend(friend.friendName, customMessage);

      const result: SparkResult = {
        friendId: friend.friendName, // 使用名称作为临时 ID
        friendName: friend.friendName,
        status: sendResult.success ? 'success' : 'failed',
        message: sendResult.message,
        error: sendResult.error,
        sentAt: sendResult.sentAt,
      };

      results.push(result);

      // 随机延迟
      if (this.config.enableAntiDetect) {
        await this.client.randomWait();
      } else {
        const page = this.client.getPage();
        await page.waitForTimeout(delay);
      }
    }

    const successCount = results.filter((r) => r.status === 'success').length;
    console.log(`${LOG_PREFIX} 批量发送完成: ${successCount}/${friends.length} 成功`);

    return results;
  }

  /**
   * 对指定好友发送自定义消息
   */
  async sendCustomMessage(friendName: string, message: string): Promise<SendResult> {
    return this.sendToFriend(friendName, message);
  }

  /**
   * 从消息池获取随机消息并发送
   */
  async sendRandomMessage(friendName: string): Promise<SendResult> {
    return this.sendToFriend(friendName);
  }
}

/**
 * 创建火花保持器实例
 */
export function createSparkKeeper(
  client: BrowserClient,
  messagePool: MessagePool,
  config?: Partial<SparkKeeperConfig>
): SparkKeeper {
  return new SparkKeeper(client, messagePool, config);
}
