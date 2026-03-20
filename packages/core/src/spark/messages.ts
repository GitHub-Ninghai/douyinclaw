/**
 * 消息池管理模块
 * 管理火花续命用的消息模板
 */

import type { MessagePoolItem } from '@douyinclaw/shared';

const LOG_PREFIX = '[Messages]';

/**
 * 默认火花消息模板
 */
const defaultSparkMessages: Omit<MessagePoolItem, 'id' | 'usedCount' | 'createdAt'>[] = [
  { content: '早安～今天也要元气满满哦', category: 'spark' },
  { content: '分享一个好消息，今天天气超好', category: 'spark' },
  { content: '在干嘛呢？想你了', category: 'spark' },
  { content: '看到一个超搞笑的视频哈哈', category: 'spark' },
  { content: '最近有什么好看的剧推荐吗？', category: 'spark' },
  { content: '中午吃什么好呢，好纠结', category: 'spark' },
  { content: '周末有什么安排呀', category: 'spark' },
  { content: '今天工作/学习辛苦啦', category: 'spark' },
  { content: '晚安，做个好梦', category: 'spark' },
  { content: '最近怎么样？好久没聊了', category: 'spark' },
  { content: '看到这个就想到了你', category: 'spark' },
  { content: '今天心情怎么样？', category: 'spark' },
  { content: '有没有什么新鲜事分享一下', category: 'spark' },
  { content: '刚刚听到一首超好听的歌', category: 'spark' },
  { content: '今天发生了件有趣的事', category: 'spark' },
];

/**
 * 消息池管理器类
 */
export class MessagePool {
  private messages: Map<string, MessagePoolItem> = new Map();
  private sparkMessages: MessagePoolItem[] = [];
  private greetingMessages: MessagePoolItem[] = [];
  private replyMessages: MessagePoolItem[] = [];

  constructor(initialMessages?: MessagePoolItem[]) {
    if (initialMessages && initialMessages.length > 0) {
      this.loadMessages(initialMessages);
    } else {
      this.loadDefaultMessages();
    }
  }

  /**
   * 加载默认消息
   */
  private loadDefaultMessages(): void {
    const now = new Date();

    defaultSparkMessages.forEach((msg, index) => {
      const item: MessagePoolItem = {
        id: `default-spark-${index}`,
        content: msg.content,
        category: msg.category as 'spark' | 'greeting' | 'reply',
        usedCount: 0,
        createdAt: now,
      };
      this.messages.set(item.id, item);
      this.sparkMessages.push(item);
    });

    console.log(`${LOG_PREFIX} 已加载 ${this.sparkMessages.length} 条默认火花消息`);
  }

  /**
   * 加载消息列表
   */
  loadMessages(messages: MessagePoolItem[]): void {
    this.messages.clear();
    this.sparkMessages = [];
    this.greetingMessages = [];
    this.replyMessages = [];

    for (const msg of messages) {
      this.messages.set(msg.id, msg);

      switch (msg.category) {
        case 'spark':
          this.sparkMessages.push(msg);
          break;
        case 'greeting':
          this.greetingMessages.push(msg);
          break;
        case 'reply':
          this.replyMessages.push(msg);
          break;
      }
    }

    console.log(`${LOG_PREFIX} 已加载 ${messages.length} 条消息`);
  }

  /**
   * 添加消息
   */
  addMessage(content: string, category: 'spark' | 'greeting' | 'reply'): MessagePoolItem {
    const item: MessagePoolItem = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      content,
      category,
      usedCount: 0,
      createdAt: new Date(),
    };

    this.messages.set(item.id, item);

    switch (category) {
      case 'spark':
        this.sparkMessages.push(item);
        break;
      case 'greeting':
        this.greetingMessages.push(item);
        break;
      case 'reply':
        this.replyMessages.push(item);
        break;
    }

    console.log(`${LOG_PREFIX} 添加消息: ${content.substring(0, 20)}...`);
    return item;
  }

  /**
   * 删除消息
   */
  deleteMessage(id: string): boolean {
    const msg = this.messages.get(id);
    if (!msg) {
      return false;
    }

    this.messages.delete(id);

    // 从分类数组中移除
    switch (msg.category) {
      case 'spark':
        this.sparkMessages = this.sparkMessages.filter((m) => m.id !== id);
        break;
      case 'greeting':
        this.greetingMessages = this.greetingMessages.filter((m) => m.id !== id);
        break;
      case 'reply':
        this.replyMessages = this.replyMessages.filter((m) => m.id !== id);
        break;
    }

    console.log(`${LOG_PREFIX} 删除消息: ${id}`);
    return true;
  }

  /**
   * 更新消息
   */
  updateMessage(id: string, content: string): MessagePoolItem | null {
    const msg = this.messages.get(id);
    if (!msg) {
      return null;
    }

    msg.content = content;
    console.log(`${LOG_PREFIX} 更新消息: ${id}`);
    return msg;
  }

  /**
   * 获取随机火花消息
   * 优先选择使用次数较少的消息
   */
  getRandomSparkMessage(): MessagePoolItem {
    if (this.sparkMessages.length === 0) {
      throw new Error('火花消息池为空');
    }

    // 按使用次数排序，选择使用次数最少的一批
    const sorted = [...this.sparkMessages].sort((a, b) => a.usedCount - b.usedCount);
    const minUsedCount = sorted[0]!.usedCount;
    const leastUsed = sorted.filter((m) => m.usedCount === minUsedCount);

    // 从使用次数最少的消息中随机选择
    const selected = leastUsed[Math.floor(Math.random() * leastUsed.length)]!;

    // 增加使用计数
    selected.usedCount++;

    console.log(`${LOG_PREFIX} 选择消息: ${selected.content.substring(0, 20)}... (使用次数: ${selected.usedCount})`);
    return selected;
  }

  /**
   * 获取随机问候消息
   */
  getRandomGreetingMessage(): MessagePoolItem | null {
    if (this.greetingMessages.length === 0) {
      return null;
    }

    const sorted = [...this.greetingMessages].sort((a, b) => a.usedCount - b.usedCount);
    const minUsedCount = sorted[0]!.usedCount;
    const leastUsed = sorted.filter((m) => m.usedCount === minUsedCount);

    const selected = leastUsed[Math.floor(Math.random() * leastUsed.length)]!;
    selected.usedCount++;

    return selected;
  }

  /**
   * 获取随机回复消息
   */
  getRandomReplyMessage(): MessagePoolItem | null {
    if (this.replyMessages.length === 0) {
      return null;
    }

    const sorted = [...this.replyMessages].sort((a, b) => a.usedCount - b.usedCount);
    const minUsedCount = sorted[0]!.usedCount;
    const leastUsed = sorted.filter((m) => m.usedCount === minUsedCount);

    const selected = leastUsed[Math.floor(Math.random() * leastUsed.length)]!;
    selected.usedCount++;

    return selected;
  }

  /**
   * 获取所有消息
   */
  getAllMessages(): MessagePoolItem[] {
    return Array.from(this.messages.values());
  }

  /**
   * 按分类获取消息
   */
  getMessagesByCategory(category: 'spark' | 'greeting' | 'reply'): MessagePoolItem[] {
    switch (category) {
      case 'spark':
        return [...this.sparkMessages];
      case 'greeting':
        return [...this.greetingMessages];
      case 'reply':
        return [...this.replyMessages];
    }
  }

  /**
   * 获取消息数量统计
   */
  getStats(): { total: number; spark: number; greeting: number; reply: number } {
    return {
      total: this.messages.size,
      spark: this.sparkMessages.length,
      greeting: this.greetingMessages.length,
      reply: this.replyMessages.length,
    };
  }

  /**
   * 清空消息池
   */
  clear(): void {
    this.messages.clear();
    this.sparkMessages = [];
    this.greetingMessages = [];
    this.replyMessages = [];
    console.log(`${LOG_PREFIX} 消息池已清空`);
  }

  /**
   * 重置所有消息的使用计数
   */
  resetUsedCount(): void {
    for (const msg of this.messages.values()) {
      msg.usedCount = 0;
    }
    console.log(`${LOG_PREFIX} 已重置所有消息的使用计数`);
  }
}

/**
 * 创建消息池实例
 */
export function createMessagePool(initialMessages?: MessagePoolItem[]): MessagePool {
  return new MessagePool(initialMessages);
}

/**
 * 快捷函数：获取随机火花消息内容
 */
export function getRandomSparkContent(pool: MessagePool): string {
  return pool.getRandomSparkMessage().content;
}
