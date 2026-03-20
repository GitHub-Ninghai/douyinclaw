/**
 * 数据库连接配置
 * 使用 Drizzle ORM + SQLite (@libsql/client)
 */

import { drizzle } from 'drizzle-orm/libsql';
import { createClient, type Client } from '@libsql/client';
import * as schema from './schema.js';

export interface DbConfig {
  /** 数据库文件路径，默认为 ./data/douyinclaw.db */
  url?: string;
  /** 是否启用日志 */
  logger?: boolean;
}

let dbInstance: ReturnType<typeof drizzle> | null = null;
let clientInstance: Client | null = null;

/**
 * 创建数据库连接
 */
export function createDbConnection(config: DbConfig = {}) {
  const url = config.url || process.env.DATABASE_URL || 'file:./data/douyinclaw.db';

  clientInstance = createClient({ url });

  dbInstance = drizzle(clientInstance, {
    schema,
    logger: config.logger ?? process.env.NODE_ENV === 'development',
  });

  return dbInstance;
}

/**
 * 获取数据库实例
 */
export function getDb() {
  if (!dbInstance) {
    return createDbConnection();
  }
  return dbInstance;
}

/**
 * 获取原始客户端实例
 */
export function getClient(): Client {
  if (!clientInstance) {
    createDbConnection();
  }
  return clientInstance!;
}

/**
 * 关闭数据库连接
 */
export async function closeDbConnection(): Promise<void> {
  if (clientInstance) {
    clientInstance.close();
    clientInstance = null;
    dbInstance = null;
  }
}

/**
 * 重置数据库连接（用于测试）
 */
export function resetDbConnection(): void {
  clientInstance = null;
  dbInstance = null;
}

// 导出类型
export type Db = ReturnType<typeof drizzle<typeof schema>>;
