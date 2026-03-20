/**
 * 火花检测器模块
 * 扫描好友列表，识别火花状态
 */

import type { Page, ElementHandle } from 'playwright';
import type { SparkFriend } from '@douyinclaw/shared';
import { BrowserClient } from '../browser/client.js';
import { douyinSelectors, getAllSelectors } from '../browser/selectors.js';

const LOG_PREFIX = '[SparkDetector]';

/**
 * 火花检测配置
 */
export interface SparkDetectorConfig {
  /** 扫描超时时间 (ms) */
  scanTimeout: number;

  /** 每页好友数量 */
  pageSize: number;

  /** 最大扫描页数 */
  maxPages: number;
}

const defaultConfig: SparkDetectorConfig = {
  scanTimeout: 30000,
  pageSize: 50,
  maxPages: 10,
};

/**
 * 火花检测器类
 */
export class SparkDetector {
  private client: BrowserClient;
  private config: SparkDetectorConfig;

  constructor(client: BrowserClient, config: Partial<SparkDetectorConfig> = {}) {
    this.client = client;
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * 打开消息页面
   */
  private async openMessagePage(): Promise<void> {
    const page = this.client.getPage();
    console.log(`${LOG_PREFIX} 正在打开消息页面...`);

    try {
      // 尝试点击消息图标
      const messageIconConfig = douyinSelectors.message.messageIcon;
      const selectors = getAllSelectors(messageIconConfig);

      let clicked = false;
      for (const selector of selectors) {
        try {
          const element = await page.waitForSelector(selector, { timeout: 5000 });
          if (element) {
            await element.click();
            clicked = true;
            break;
          }
        } catch {
          continue;
        }
      }

      if (!clicked) {
        // 直接导航到消息页面
        await this.client.navigate('https://www.douyin.com/user/self?showTab=message');
      }

      // 等待消息面板加载
      await page.waitForTimeout(2000);
      console.log(`${LOG_PREFIX} 消息页面已打开`);
    } catch (error) {
      console.error(`${LOG_PREFIX} 打开消息页面失败:`, error);
      throw error;
    }
  }

  /**
   * 扫描好友列表，获取火花信息
   */
  async scanSparkFriends(): Promise<SparkFriend[]> {
    console.log(`${LOG_PREFIX} 开始扫描火花好友...`);

    try {
      // 确保在消息页面
      await this.openMessagePage();

      const page = this.client.getPage();
      const sparkFriends: SparkFriend[] = [];

      // 获取会话列表
      const conversationListConfig = douyinSelectors.message.conversationList;
      const selectors = getAllSelectors(conversationListConfig);

      let conversationContainer: ElementHandle | null = null;
      for (const selector of selectors) {
        try {
          conversationContainer = await page.waitForSelector(selector, { timeout: 5000 });
          if (conversationContainer) break;
        } catch {
          continue;
        }
      }

      if (!conversationContainer) {
        console.log(`${LOG_PREFIX} 未找到会话列表容器`);
        return [];
      }

      // 滚动并收集所有会话
      await this.scrollToLoadAllConversations(page, conversationContainer);

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

      console.log(`${LOG_PREFIX} 找到 ${conversationItems.length} 个会话`);

      // 遍历每个会话，检查火花状态
      for (const item of conversationItems) {
        try {
          const sparkInfo = await this.extractSparkInfo(page, item);
          if (sparkInfo) {
            sparkFriends.push(sparkInfo);
          }
        } catch {
          // 忽略单个会话的错误
        }
      }

      console.log(`${LOG_PREFIX} 扫描完成，找到 ${sparkFriends.length} 个火花好友`);
      return sparkFriends;
    } catch (error) {
      console.error(`${LOG_PREFIX} 扫描火花好友失败:`, error);
      throw error;
    }
  }

  /**
   * 滚动加载所有会话
   */
  private async scrollToLoadAllConversations(
    page: Page,
    container: ElementHandle
  ): Promise<void> {
    let previousCount = 0;
    let noChangeCount = 0;

    for (let i = 0; i < this.config.maxPages; i++) {
      // 滚动到底部
      await container.evaluate((el: Element) => {
        const htmlEl = el as HTMLElement;
        htmlEl.scrollTop = htmlEl.scrollHeight;
      });

      await page.waitForTimeout(1000);

      // 检查是否有新会话加载
      const itemConfig = douyinSelectors.message.conversationItem;
      const itemSelectors = getAllSelectors(itemConfig);

      let currentCount = 0;
      for (const selector of itemSelectors) {
        try {
          const items = await page.$$(selector);
          currentCount = items.length;
          if (currentCount > 0) break;
        } catch {
          continue;
        }
      }

      if (currentCount === previousCount) {
        noChangeCount++;
        if (noChangeCount >= 2) {
          break;
        }
      } else {
        noChangeCount = 0;
      }

      previousCount = currentCount;
    }
  }

  /**
   * 从会话元素中提取火花信息
   */
  private async extractSparkInfo(
    _page: Page,
    item: ElementHandle
  ): Promise<SparkFriend | null> {
    try {
      // 检查是否有火花标记
      const sparkIconConfig = douyinSelectors.spark.sparkIcon;
      const sparkSelectors = getAllSelectors(sparkIconConfig);

      let hasSpark = false;
      for (const selector of sparkSelectors) {
        try {
          const sparkEl = await item.$(selector);
          if (sparkEl) {
            hasSpark = true;
            break;
          }
        } catch {
          continue;
        }
      }

      // 如果没有火花图标，尝试通过文本检测
      if (!hasSpark) {
        hasSpark = await item.evaluate((el) => {
          const text = el.textContent || '';
          return text.includes('火花') || text.includes('天');
        });
      }

      if (!hasSpark) {
        return null;
      }

      // 获取好友名称
      const nameConfig = douyinSelectors.spark.friendName;
      const nameSelectors = getAllSelectors(nameConfig);

      let friendName = '';
      for (const selector of nameSelectors) {
        try {
          const nameEl = await item.$(selector);
          if (nameEl) {
            friendName = (await nameEl.textContent()) || '';
            if (friendName) break;
          }
        } catch {
          continue;
        }
      }

      // 如果无法获取名称，尝试从整个元素获取
      if (!friendName) {
        friendName = await item.evaluate((el) => {
          // 通常第一个文本就是好友名称
          const textNodes: string[] = [];
          const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
          let node: Node | null;
          while ((node = walker.nextNode())) {
            const text = node.textContent?.trim();
            if (text && text.length > 0 && !text.includes('火花') && !text.includes('天')) {
              textNodes.push(text);
            }
          }
          return textNodes[0] || '';
        });
      }

      if (!friendName) {
        return null;
      }

      // 获取火花天数
      let sparkDays = 0;
      const daysConfig = douyinSelectors.spark.sparkDays;
      const daysSelectors = getAllSelectors(daysConfig);

      for (const selector of daysSelectors) {
        try {
          const daysEl = await item.$(selector);
          if (daysEl) {
            const daysText = (await daysEl.textContent()) || '';
            const match = daysText.match(/(\d+)/);
            if (match) {
              sparkDays = parseInt(match[1]!, 10);
              break;
            }
          }
        } catch {
          continue;
        }
      }

      // 如果无法获取天数，尝试从整个元素提取
      if (sparkDays === 0) {
        sparkDays = await item.evaluate((el: Element) => {
          const text = el.textContent || '';
          const match = text.match(/(\d+)\s*天/);
          return match ? parseInt(match[1]!, 10) : 0;
        });
      }

      return {
        friendName: friendName.trim(),
        sparkDays,
        lastInteraction: new Date(),
      };
    } catch {
      return null;
    }
  }

  /**
   * 查找特定好友的火花状态
   */
  async getFriendSparkStatus(friendName: string): Promise<SparkFriend | null> {
    console.log(`${LOG_PREFIX} 查找好友 "${friendName}" 的火花状态...`);

    try {
      const allSparkFriends = await this.scanSparkFriends();
      return allSparkFriends.find((f) => f.friendName === friendName) || null;
    } catch (error) {
      console.error(`${LOG_PREFIX} 查找好友火花状态失败:`, error);
      return null;
    }
  }

  /**
   * 获取即将断连的火花好友（火花天数较低）
   */
  async getAtRiskSparkFriends(thresholdDays: number = 3): Promise<SparkFriend[]> {
    console.log(`${LOG_PREFIX} 查找即将断连的火花好友（阈值: ${thresholdDays}天）...`);

    try {
      const allSparkFriends = await this.scanSparkFriends();
      return allSparkFriends.filter((f) => f.sparkDays <= thresholdDays);
    } catch (error) {
      console.error(`${LOG_PREFIX} 查找危险火花好友失败:`, error);
      return [];
    }
  }
}

/**
 * 创建火花检测器实例
 */
export function createSparkDetector(
  client: BrowserClient,
  config?: Partial<SparkDetectorConfig>
): SparkDetector {
  return new SparkDetector(client, config);
}
