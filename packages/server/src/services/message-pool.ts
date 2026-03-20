/**
 * 消息池服务
 */

import type { MessagePoolItem, PaginatedResponse as PaginatedResponseType } from '@douyinclaw/shared';

// 使用别名以避免与本地类型冲突
type PaginatedResponse<T> = PaginatedResponseType<T>;

// 消息池存储（实际项目中应使用数据库）
const messagePoolStore: Map<string, MessagePoolItem> = new Map();

// 初始化默认消息
function initDefaultMessages(): void {
  const defaultMessages: Array<{ content: string; category: MessagePoolItem['category'] }> = [
    { content: '早安！新的一天开始啦~', category: 'spark' },
    { content: '今天也要元气满满哦！', category: 'spark' },
    { content: '记得吃早餐哦~', category: 'spark' },
    { content: '晚上好！今天过得怎么样？', category: 'spark' },
    { content: '晚安，好梦~', category: 'spark' },
    { content: '你好呀！', category: 'greeting' },
    { content: '嗨~', category: 'greeting' },
    { content: '哈哈，有意思！', category: 'reply' },
    { content: '这个视频不错！', category: 'reply' },
  ];

  defaultMessages.forEach(msg => {
    const id = generateId();
    messagePoolStore.set(id, {
      id,
      content: msg.content,
      category: msg.category,
      usedCount: 0,
      createdAt: new Date(),
    });
  });
}

// 初始化
initDefaultMessages();

/**
 * 获取消息池
 */
export async function getMessagePool(options: {
  page: number;
  pageSize: number;
  category?: 'spark' | 'greeting' | 'reply';
}): Promise<PaginatedResponse<MessagePoolItem>> {
  const { page, pageSize, category } = options;

  let messages = Array.from(messagePoolStore.values());

  // 按类别过滤
  if (category) {
    messages = messages.filter(m => m.category === category);
  }

  // 按创建时间倒序排列
  messages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  // 分页
  const total = messages.length;
  const offset = (page - 1) * pageSize;
  const items = messages.slice(offset, offset + pageSize);

  return {
    items,
    total,
    page,
    pageSize,
    hasMore: offset + pageSize < total,
  };
}

/**
 * 添加消息到池中
 */
export async function addMessageToPool(
  content: string,
  category: 'spark' | 'greeting' | 'reply'
): Promise<MessagePoolItem> {
  const id = generateId();
  const message: MessagePoolItem = {
    id,
    content,
    category,
    usedCount: 0,
    createdAt: new Date(),
  };

  messagePoolStore.set(id, message);
  return message;
}

/**
 * 更新消息
 */
export async function updateMessageInPool(
  id: string,
  data: Partial<MessagePoolItem>
): Promise<MessagePoolItem> {
  const existing = messagePoolStore.get(id);

  if (!existing) {
    throw new Error(`Message not found: ${id}`);
  }

  const updated: MessagePoolItem = {
    ...existing,
    ...data,
    id, // 确保 ID 不被修改
  };

  messagePoolStore.set(id, updated);
  return updated;
}

/**
 * 删除消息
 */
export async function deleteMessageFromPool(id: string): Promise<void> {
  if (!messagePoolStore.has(id)) {
    throw new Error(`Message not found: ${id}`);
  }

  messagePoolStore.delete(id);
}

/**
 * 获取随机消息
 */
export async function getRandomMessage(
  category?: 'spark' | 'greeting' | 'reply'
): Promise<MessagePoolItem | null> {
  let messages = Array.from(messagePoolStore.values());

  // 按类别过滤
  if (category) {
    messages = messages.filter(m => m.category === category);
  }

  if (messages.length === 0) {
    return null;
  }

  // 随机选择（优先选择使用次数少的）
  messages.sort((a, b) => a.usedCount - b.usedCount);
  const topCandidates = messages.slice(0, Math.min(5, messages.length));
  const randomIndex = Math.floor(Math.random() * topCandidates.length);
  const selected = topCandidates[randomIndex];

  if (!selected) {
    return null;
  }

  // 增加使用次数
  selected.usedCount++;
  messagePoolStore.set(selected.id, selected);

  return selected;
}

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
