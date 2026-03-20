/**
 * 数据库服务层
 * 提供所有表的 CRUD 操作
 */

import { eq, and, desc, sql, gte } from 'drizzle-orm';
import { getDb } from './connection.js';
import {
  accounts,
  friends,
  messagePool,
  sparkLogs,
  replyLogs,
  settings,
  defaultSettings,
  type InsertAccount,
  type InsertFriend,
  type InsertMessagePoolItem,
  type InsertSparkLog,
  type InsertReplyLog,
  type SelectAccount,
  type SelectFriend,
  type SelectMessagePoolItem,
  type SelectSparkLog,
  type SelectReplyLog,
} from './schema.js';
import type { AccountStatus, ReplyStyle } from '@douyinclaw/shared';

// ==================== 工具函数 ====================

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}

function toJson(value: unknown): string {
  return JSON.stringify(value);
}

function fromJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

// ==================== Account Service ====================

export class AccountService {
  /**
   * 创建账号
   */
  async create(data: Omit<InsertAccount, 'id' | 'createdAt' | 'updatedAt'>): Promise<SelectAccount> {
    const db = getDb();
    const id = generateId();
    const now = new Date();

    const [account] = await db.insert(accounts).values({
      id,
      ...data,
      createdAt: now,
      updatedAt: now,
    }).returning();

    return account!;
  }

  /**
   * 根据 ID 获取账号
   */
  async getById(id: string): Promise<SelectAccount | null> {
    const db = getDb();
    const [account] = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1);
    return account ?? null;
  }

  /**
   * 获取所有账号
   */
  async getAll(): Promise<SelectAccount[]> {
    const db = getDb();
    return db.select().from(accounts).orderBy(desc(accounts.createdAt));
  }

  /**
   * 获取活跃账号
   */
  async getActive(): Promise<SelectAccount | null> {
    const db = getDb();
    const [account] = await db.select()
      .from(accounts)
      .where(eq(accounts.status, 'active'))
      .limit(1);
    return account ?? null;
  }

  /**
   * 更新账号
   */
  async update(id: string, data: Partial<Omit<InsertAccount, 'id' | 'createdAt'>>): Promise<SelectAccount | null> {
    const db = getDb();
    const [account] = await db.update(accounts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(accounts.id, id))
      .returning();
    return account ?? null;
  }

  /**
   * 更新账号状态
   */
  async updateStatus(id: string, status: AccountStatus): Promise<SelectAccount | null> {
    return this.update(id, { status });
  }

  /**
   * 更新最后登录时间
   */
  async updateLastLogin(id: string): Promise<SelectAccount | null> {
    return this.update(id, { lastLoginAt: new Date() });
  }

  /**
   * 删除账号
   */
  async delete(id: string): Promise<boolean> {
    const db = getDb();
    const result = await db.delete(accounts).where(eq(accounts.id, id)).returning();
    return result.length > 0;
  }
}

// ==================== Friend Service ====================

export class FriendService {
  /**
   * 创建好友
   */
  async create(data: Omit<InsertFriend, 'id' | 'createdAt' | 'updatedAt'>): Promise<SelectFriend> {
    const db = getDb();
    const id = generateId();
    const now = new Date();

    const [friend] = await db.insert(friends).values({
      id,
      ...data,
      createdAt: now,
      updatedAt: now,
    }).returning();

    return friend!;
  }

  /**
   * 根据 ID 获取好友
   */
  async getById(id: string): Promise<SelectFriend | null> {
    const db = getDb();
    const [friend] = await db.select().from(friends).where(eq(friends.id, id)).limit(1);
    return friend ?? null;
  }

  /**
   * 获取账号下的所有好友
   */
  async getByAccountId(accountId: string): Promise<SelectFriend[]> {
    const db = getDb();
    return db.select()
      .from(friends)
      .where(eq(friends.accountId, accountId))
      .orderBy(desc(friends.lastInteractionAt));
  }

  /**
   * 获取启用火花的好友
   */
  async getSparkEnabled(accountId: string): Promise<SelectFriend[]> {
    const db = getDb();
    return db.select()
      .from(friends)
      .where(and(
        eq(friends.accountId, accountId),
        eq(friends.isSparkEnabled, true)
      ))
      .orderBy(desc(friends.sparkDays));
  }

  /**
   * 根据昵称查找好友
   */
  async getByNickname(accountId: string, nickname: string): Promise<SelectFriend | null> {
    const db = getDb();
    const [friend] = await db.select()
      .from(friends)
      .where(and(
        eq(friends.accountId, accountId),
        eq(friends.nickname, nickname)
      ))
      .limit(1);
    return friend ?? null;
  }

  /**
   * 更新好友
   */
  async update(id: string, data: Partial<Omit<InsertFriend, 'id' | 'accountId' | 'createdAt'>>): Promise<SelectFriend | null> {
    const db = getDb();
    const [friend] = await db.update(friends)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(friends.id, id))
      .returning();
    return friend ?? null;
  }

  /**
   * 更新火花天数
   */
  async updateSparkDays(id: string, sparkDays: number): Promise<SelectFriend | null> {
    return this.update(id, { sparkDays, lastInteractionAt: new Date() });
  }

  /**
   * 更新火花开关
   */
  async updateSparkEnabled(id: string, enabled: boolean): Promise<SelectFriend | null> {
    return this.update(id, { isSparkEnabled: enabled });
  }

  /**
   * 更新回复风格
   */
  async updateReplyStyle(
    id: string,
    style: ReplyStyle,
    persona?: string,
    maxLength?: number
  ): Promise<SelectFriend | null> {
    return this.update(id, {
      replyStyle: style.tone,
      replyPersona: persona ?? style.persona,
      replyMaxLength: maxLength ?? style.maxLength,
    });
  }

  /**
   * 删除好友
   */
  async delete(id: string): Promise<boolean> {
    const db = getDb();
    const result = await db.delete(friends).where(eq(friends.id, id)).returning();
    return result.length > 0;
  }

  /**
   * 批量创建或更新好友
   */
  async upsertBatch(accountId: string, friendList: Array<{ nickname: string; sparkDays: number }>): Promise<number> {
    let upsertCount = 0;

    for (const friendData of friendList) {
      const existing = await this.getByNickname(accountId, friendData.nickname);

      if (existing) {
        // 更新火花天数
        await this.updateSparkDays(existing.id, friendData.sparkDays);
      } else {
        // 创建新好友
        await this.create({
          accountId,
          nickname: friendData.nickname,
          sparkDays: friendData.sparkDays,
          isSparkEnabled: true,
          replyStyle: 'casual',
        });
        upsertCount++;
      }
    }

    return upsertCount;
  }
}

// ==================== Message Pool Service ====================

export class MessagePoolService {
  /**
   * 创建消息
   */
  async create(data: Omit<InsertMessagePoolItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<SelectMessagePoolItem> {
    const db = getDb();
    const id = generateId();
    const now = new Date();

    const [item] = await db.insert(messagePool).values({
      id,
      ...data,
      createdAt: now,
      updatedAt: now,
    }).returning();

    return item!;
  }

  /**
   * 获取所有消息
   */
  async getAll(): Promise<SelectMessagePoolItem[]> {
    const db = getDb();
    return db.select().from(messagePool).orderBy(desc(messagePool.createdAt));
  }

  /**
   * 按类别获取消息
   */
  async getByCategory(category: 'spark' | 'greeting' | 'reply'): Promise<SelectMessagePoolItem[]> {
    const db = getDb();
    return db.select()
      .from(messagePool)
      .where(and(
        eq(messagePool.category, category),
        eq(messagePool.isEnabled, true)
      ))
      .orderBy(desc(messagePool.usedCount));
  }

  /**
   * 获取随机火花消息
   */
  async getRandomSparkMessage(): Promise<SelectMessagePoolItem | null> {
    const db = getDb();
    const items = await db.select()
      .from(messagePool)
      .where(and(
        eq(messagePool.category, 'spark'),
        eq(messagePool.isEnabled, true)
      ))
      .orderBy(sql`RANDOM()`)
      .limit(1);

    return items[0] ?? null;
  }

  /**
   * 更新消息
   */
  async update(id: string, data: Partial<Omit<InsertMessagePoolItem, 'id' | 'createdAt'>>): Promise<SelectMessagePoolItem | null> {
    const db = getDb();
    const [item] = await db.update(messagePool)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(messagePool.id, id))
      .returning();
    return item ?? null;
  }

  /**
   * 增加使用次数
   */
  async incrementUsedCount(id: string): Promise<void> {
    const db = getDb();
    const item = await this.getById(id);
    if (item) {
      await db.update(messagePool)
        .set({ usedCount: item.usedCount + 1, updatedAt: new Date() })
        .where(eq(messagePool.id, id));
    }
  }

  /**
   * 根据 ID 获取消息
   */
  async getById(id: string): Promise<SelectMessagePoolItem | null> {
    const db = getDb();
    const [item] = await db.select().from(messagePool).where(eq(messagePool.id, id)).limit(1);
    return item ?? null;
  }

  /**
   * 删除消息
   */
  async delete(id: string): Promise<boolean> {
    const db = getDb();
    const result = await db.delete(messagePool).where(eq(messagePool.id, id)).returning();
    return result.length > 0;
  }

  /**
   * 初始化默认消息
   */
  async initializeDefaults(): Promise<void> {
    const db = getDb();
    const existing = await db.select().from(messagePool).limit(1);
    if (existing.length > 0) return;

    const defaultMessages = [
      { content: '早上好呀！新的一天开始了', category: 'spark' as const },
      { content: '今天天气怎么样？', category: 'spark' as const },
      { content: '最近在忙什么呢？', category: 'spark' as const },
      { content: '分享一首好听的歌给你', category: 'spark' as const },
      { content: '今天有什么有趣的事吗？', category: 'spark' as const },
      { content: '晚上好！今天过得怎么样', category: 'spark' as const },
      { content: '周末有什么安排吗？', category: 'spark' as const },
      { content: '好久不见，最近还好吗？', category: 'greeting' as const },
    ];

    for (const msg of defaultMessages) {
      await this.create({ ...msg, usedCount: 0, isEnabled: true });
    }
  }
}

// ==================== Spark Log Service ====================

export class SparkLogService {
  /**
   * 创建火花日志
   */
  async create(data: Omit<InsertSparkLog, 'id' | 'createdAt'>): Promise<SelectSparkLog> {
    const db = getDb();
    const id = generateId();

    const [log] = await db.insert(sparkLogs).values({
      id,
      ...data,
      createdAt: new Date(),
    }).returning();

    return log!;
  }

  /**
   * 获取日志列表
   */
  async getList(options?: {
    accountId?: string;
    friendId?: string;
    status?: 'success' | 'failed' | 'skipped';
    limit?: number;
    offset?: number;
  }): Promise<SelectSparkLog[]> {
    const db = getDb();
    const conditions = [];

    if (options?.accountId) {
      conditions.push(eq(sparkLogs.accountId, options.accountId));
    }
    if (options?.friendId) {
      conditions.push(eq(sparkLogs.friendId, options.friendId));
    }
    if (options?.status) {
      conditions.push(eq(sparkLogs.status, options.status));
    }

    let query = db.select().from(sparkLogs);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    query = query.orderBy(desc(sparkLogs.sentAt)) as typeof query;

    if (options?.limit) {
      query = query.limit(options.limit) as typeof query;
    }
    if (options?.offset) {
      query = query.offset(options.offset) as typeof query;
    }

    return query;
  }

  /**
   * 获取今日统计
   */
  async getTodayStats(accountId: string): Promise<{ success: number; failed: number; total: number }> {
    const db = getDb();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const logs = await db.select()
      .from(sparkLogs)
      .where(and(
        eq(sparkLogs.accountId, accountId),
        gte(sparkLogs.sentAt, today)
      ));

    const success = logs.filter(l => l.status === 'success').length;
    const failed = logs.filter(l => l.status === 'failed').length;

    return {
      success,
      failed,
      total: logs.length,
    };
  }

  /**
   * 获取指定好友最近的日志
   */
  async getRecentByFriend(friendId: string, limit: number = 10): Promise<SelectSparkLog[]> {
    const db = getDb();
    return db.select()
      .from(sparkLogs)
      .where(eq(sparkLogs.friendId, friendId))
      .orderBy(desc(sparkLogs.sentAt))
      .limit(limit);
  }
}

// ==================== Reply Log Service ====================

export class ReplyLogService {
  /**
   * 创建回复日志
   */
  async create(data: Omit<InsertReplyLog, 'id' | 'createdAt'>): Promise<SelectReplyLog> {
    const db = getDb();
    const id = generateId();

    const [log] = await db.insert(replyLogs).values({
      id,
      ...data,
      createdAt: new Date(),
    }).returning();

    return log!;
  }

  /**
   * 获取日志列表
   */
  async getList(options?: {
    accountId?: string;
    friendId?: string;
    status?: 'pending' | 'sent' | 'rejected';
    limit?: number;
    offset?: number;
  }): Promise<SelectReplyLog[]> {
    const db = getDb();
    const conditions = [];

    if (options?.accountId) {
      conditions.push(eq(replyLogs.accountId, options.accountId));
    }
    if (options?.friendId) {
      conditions.push(eq(replyLogs.friendId, options.friendId));
    }
    if (options?.status) {
      conditions.push(eq(replyLogs.status, options.status));
    }

    let query = db.select().from(replyLogs);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    query = query.orderBy(desc(replyLogs.createdAt)) as typeof query;

    if (options?.limit) {
      query = query.limit(options.limit) as typeof query;
    }
    if (options?.offset) {
      query = query.offset(options.offset) as typeof query;
    }

    return query;
  }

  /**
   * 根据 ID 获取日志
   */
  async getById(id: string): Promise<SelectReplyLog | null> {
    const db = getDb();
    const [log] = await db.select().from(replyLogs).where(eq(replyLogs.id, id)).limit(1);
    return log ?? null;
  }

  /**
   * 更新日志状态
   */
  async updateStatus(id: string, status: 'pending' | 'sent' | 'rejected'): Promise<SelectReplyLog | null> {
    const db = getDb();
    const updateData: Partial<InsertReplyLog> = { status };

    if (status === 'sent') {
      updateData.sentAt = new Date();
    }

    const [log] = await db.update(replyLogs)
      .set(updateData)
      .where(eq(replyLogs.id, id))
      .returning();
    return log ?? null;
  }

  /**
   * 获取今日回复数
   */
  async getTodayCount(accountId: string): Promise<number> {
    const db = getDb();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const logs = await db.select()
      .from(replyLogs)
      .where(and(
        eq(replyLogs.accountId, accountId),
        gte(replyLogs.createdAt, today)
      ));

    return logs.length;
  }

  /**
   * 获取待审批的回复
   */
  async getPending(accountId: string): Promise<SelectReplyLog[]> {
    const db = getDb();
    return db.select()
      .from(replyLogs)
      .where(and(
        eq(replyLogs.accountId, accountId),
        eq(replyLogs.status, 'pending')
      ))
      .orderBy(desc(replyLogs.createdAt));
  }
}

// ==================== Settings Service ====================

export class SettingsService {
  /**
   * 获取设置值
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    const db = getDb();
    const [setting] = await db.select().from(settings).where(eq(settings.key, key)).limit(1);

    if (!setting) return null;
    return fromJson<T>(setting.value);
  }

  /**
   * 设置值
   */
  async set<T>(key: string, value: T): Promise<void> {
    const db = getDb();
    const valueStr = toJson(value);

    await db.insert(settings)
      .values({ key, value: valueStr, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: valueStr, updatedAt: new Date() },
      });
  }

  /**
   * 获取所有设置
   */
  async getAll(): Promise<Record<string, unknown>> {
    const db = getDb();
    const allSettings = await db.select().from(settings);

    const result: Record<string, unknown> = {};
    for (const setting of allSettings) {
      const parsed = fromJson(setting.value);
      if (parsed !== null) {
        result[setting.key] = parsed;
      }
    }

    return result;
  }

  /**
   * 删除设置
   */
  async delete(key: string): Promise<boolean> {
    const db = getDb();
    const result = await db.delete(settings).where(eq(settings.key, key)).returning();
    return result.length > 0;
  }

  /**
   * 初始化默认设置
   */
  async initializeDefaults(): Promise<void> {
    const db = getDb();
    const existing = await db.select().from(settings).limit(1);
    if (existing.length > 0) return;

    for (const [key, config] of Object.entries(defaultSettings)) {
      await this.set(key, config.value);
    }
  }

  /**
   * 获取设置描述
   */
  getDescription(key: string): string | undefined {
    return defaultSettings[key]?.description;
  }

  /**
   * 批量设置
   */
  async setMany(settingsMap: Record<string, unknown>): Promise<void> {
    for (const [key, value] of Object.entries(settingsMap)) {
      await this.set(key, value);
    }
  }
}

// ==================== 服务实例 ====================

export const accountService = new AccountService();
export const friendService = new FriendService();
export const messagePoolService = new MessagePoolService();
export const sparkLogService = new SparkLogService();
export const replyLogService = new ReplyLogService();
export const settingsService = new SettingsService();

// ==================== 初始化函数 ====================

/**
 * 初始化数据库（创建表、填充默认数据）
 */
export async function initializeDatabase(): Promise<void> {
  // 这里应该运行 Drizzle 的 migrate，但需要配置文件
  // 暂时只初始化默认数据
  await settingsService.initializeDefaults();
  await messagePoolService.initializeDefaults();
}
