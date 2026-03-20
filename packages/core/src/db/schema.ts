/**
 * 数据库 Schema 定义
 * 使用 Drizzle ORM + SQLite (@libsql/client)
 */

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ==================== 账号表 ====================

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  nickname: text('nickname').notNull(),
  storagePath: text('storage_path').notNull(),
  status: text('status', { enum: ['active', 'inactive', 'expired', 'error'] }).notNull().default('inactive'),
  lastLoginAt: integer('last_login_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  statusIdx: index('accounts_status_idx').on(table.status),
}));

export const accountsRelations = relations(accounts, ({ many }) => ({
  friends: many(friends),
  sparkLogs: many(sparkLogs),
  replyLogs: many(replyLogs),
}));

// ==================== 好友表 ====================

export const friends = sqliteTable('friends', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  nickname: text('nickname').notNull(),
  avatar: text('avatar'),
  sparkDays: integer('spark_days').notNull().default(0),
  isSparkEnabled: integer('is_spark_enabled', { mode: 'boolean' }).notNull().default(true),
  replyStyle: text('reply_style', { enum: ['casual', 'humorous', 'analytical', 'brief'] }).notNull().default('casual'),
  replyPersona: text('reply_persona'),
  replyMaxLength: integer('reply_max_length').default(100),
  lastInteractionAt: integer('last_interaction_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  accountIdx: index('friends_account_idx').on(table.accountId),
  sparkEnabledIdx: index('friends_spark_enabled_idx').on(table.isSparkEnabled),
  nicknameIdx: index('friends_nickname_idx').on(table.nickname),
}));

export const friendsRelations = relations(friends, ({ one, many }) => ({
  account: one(accounts, {
    fields: [friends.accountId],
    references: [accounts.id],
  }),
  sparkLogs: many(sparkLogs),
  replyLogs: many(replyLogs),
}));

// ==================== 消息池表 ====================

export const messagePool = sqliteTable('message_pool', {
  id: text('id').primaryKey(),
  content: text('content').notNull(),
  category: text('category', { enum: ['spark', 'greeting', 'reply'] }).notNull().default('spark'),
  usedCount: integer('used_count').notNull().default(0),
  isEnabled: integer('is_enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  categoryIdx: index('message_pool_category_idx').on(table.category),
  enabledIdx: index('message_pool_enabled_idx').on(table.isEnabled),
}));

// ==================== 火花日志表 ====================

export const sparkLogs = sqliteTable('spark_logs', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  friendId: text('friend_id').notNull().references(() => friends.id, { onDelete: 'cascade' }),
  friendName: text('friend_name').notNull(),
  message: text('message').notNull(),
  status: text('status', { enum: ['success', 'failed', 'skipped'] }).notNull().default('success'),
  errorMessage: text('error_message'),
  sentAt: integer('sent_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  accountIdx: index('spark_logs_account_idx').on(table.accountId),
  friendIdx: index('spark_logs_friend_idx').on(table.friendId),
  sentAtIdx: index('spark_logs_sent_at_idx').on(table.sentAt),
  statusIdx: index('spark_logs_status_idx').on(table.status),
}));

export const sparkLogsRelations = relations(sparkLogs, ({ one }) => ({
  account: one(accounts, {
    fields: [sparkLogs.accountId],
    references: [accounts.id],
  }),
  friend: one(friends, {
    fields: [sparkLogs.friendId],
    references: [friends.id],
  }),
}));

// ==================== 回复日志表 ====================

export const replyLogs = sqliteTable('reply_logs', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  friendId: text('friend_id').notNull().references(() => friends.id, { onDelete: 'cascade' }),
  friendName: text('friend_name').notNull(),
  videoTitle: text('video_title'),
  videoUrl: text('video_url'),
  originalMessage: text('original_message'),
  aiReply: text('ai_reply').notNull(),
  videoAnalysis: text('video_analysis'), // JSON string of VideoAnalysis
  status: text('status', { enum: ['pending', 'sent', 'rejected'] }).notNull().default('pending'),
  tokensUsed: integer('tokens_used'), // JSON string of { input, output }
  confidence: integer('confidence'), // Stored as integer (0-100)
  sentAt: integer('sent_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  accountIdx: index('reply_logs_account_idx').on(table.accountId),
  friendIdx: index('reply_logs_friend_idx').on(table.friendId),
  statusIdx: index('reply_logs_status_idx').on(table.status),
  createdAtIdx: index('reply_logs_created_at_idx').on(table.createdAt),
}));

export const replyLogsRelations = relations(replyLogs, ({ one }) => ({
  account: one(accounts, {
    fields: [replyLogs.accountId],
    references: [accounts.id],
  }),
  friend: one(friends, {
    fields: [replyLogs.friendId],
    references: [friends.id],
  }),
}));

// ==================== 设置表 ====================

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(), // JSON string
  description: text('description'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// ==================== 类型导出 ====================

// Insert types
export type InsertAccount = typeof accounts.$inferInsert;
export type InsertFriend = typeof friends.$inferInsert;
export type InsertMessagePoolItem = typeof messagePool.$inferInsert;
export type InsertSparkLog = typeof sparkLogs.$inferInsert;
export type InsertReplyLog = typeof replyLogs.$inferInsert;
export type InsertSetting = typeof settings.$inferInsert;

// Select types
export type SelectAccount = typeof accounts.$inferSelect;
export type SelectFriend = typeof friends.$inferSelect;
export type SelectMessagePoolItem = typeof messagePool.$inferSelect;
export type SelectSparkLog = typeof sparkLogs.$inferSelect;
export type SelectReplyLog = typeof replyLogs.$inferSelect;
export type SelectSetting = typeof settings.$inferSelect;

// ==================== 默认设置 ====================

export const defaultSettings: Record<string, { value: string; description: string }> = {
  // 火花设置
  sparkCron1: {
    value: '0 8 * * *',
    description: '火花定时任务 1 (cron 表达式)',
  },
  sparkCron2: {
    value: '0 20 * * *',
    description: '火花定时任务 2 (cron 表达式)',
  },

  // 消息检查
  messageCheckInterval: {
    value: '60000',
    description: '消息检查间隔 (毫秒)',
  },

  // 会话心跳
  sessionHeartbeatInterval: {
    value: '300000',
    description: '会话心跳间隔 (毫秒)',
  },

  // AI 设置
  aiProvider: {
    value: 'claude',
    description: 'AI Provider 类型',
  },
  aiModel: {
    value: 'claude-sonnet-4-20250514',
    description: 'AI 模型名称',
  },
  aiMaxTokens: {
    value: '1024',
    description: 'AI 最大 token 数',
  },

  // 飞书通知
  feishuEnabled: {
    value: 'false',
    description: '是否启用飞书通知',
  },
  feishuNotifyOnSpark: {
    value: 'true',
    description: '火花完成后是否通知',
  },
  feishuNotifyOnReply: {
    value: 'true',
    description: '回复完成后是否通知',
  },
  feishuNotifyOnError: {
    value: 'true',
    description: '发生错误时是否通知',
  },

  // 自动回复
  autoReplyEnabled: {
    value: 'false',
    description: '是否启用自动回复',
  },
  replyRequireApproval: {
    value: 'true',
    description: '回复是否需要审批',
  },
};
