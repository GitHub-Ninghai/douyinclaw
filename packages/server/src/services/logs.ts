/**
 * 日志服务
 */

import type { PaginatedResponse } from '@douyinclaw/shared';

// 日志条目类型
interface LogEntry {
  id: string;
  type: 'spark' | 'reply' | 'system';
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: Record<string, unknown>;
  timestamp: Date;
}

// 日志存储（实际项目中应使用数据库）
const logsStore: Map<string, LogEntry> = new Map();

/**
 * 获取日志列表
 */
export async function getLogs(options: {
  page: number;
  pageSize: number;
  type?: 'spark' | 'reply' | 'system';
  startDate?: string;
  endDate?: string;
}): Promise<PaginatedResponse<LogEntry>> {
  const { page, pageSize, type, startDate, endDate } = options;

  let logs = Array.from(logsStore.values());

  // 按类型过滤
  if (type) {
    logs = logs.filter(l => l.type === type);
  }

  // 按日期范围过滤
  if (startDate) {
    const start = new Date(startDate);
    logs = logs.filter(l => l.timestamp >= start);
  }
  if (endDate) {
    const end = new Date(endDate);
    logs = logs.filter(l => l.timestamp <= end);
  }

  // 按时间倒序排列
  logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  // 分页
  const total = logs.length;
  const offset = (page - 1) * pageSize;
  const items = logs.slice(offset, offset + pageSize);

  return {
    items,
    total,
    page,
    pageSize,
    hasMore: offset + pageSize < total,
  };
}

/**
 * 添加日志
 */
export async function addLog(entry: Omit<LogEntry, 'id' | 'timestamp'>): Promise<LogEntry> {
  const log: LogEntry = {
    ...entry,
    id: generateId(),
    timestamp: new Date(),
  };

  logsStore.set(log.id, log);
  return log;
}

/**
 * 清除日志
 */
export async function clearLogs(beforeDate?: string): Promise<number> {
  if (!beforeDate) {
    const count = logsStore.size;
    logsStore.clear();
    return count;
  }

  const before = new Date(beforeDate);
  let count = 0;

  for (const [id, log] of logsStore.entries()) {
    if (log.timestamp < before) {
      logsStore.delete(id);
      count++;
    }
  }

  return count;
}

/**
 * 记录信息日志
 */
export async function logInfo(
  type: LogEntry['type'],
  message: string,
  data?: Record<string, unknown>
): Promise<void> {
  await addLog({ type, level: 'info', message, data });
}

/**
 * 记录警告日志
 */
export async function logWarn(
  type: LogEntry['type'],
  message: string,
  data?: Record<string, unknown>
): Promise<void> {
  await addLog({ type, level: 'warn', message, data });
}

/**
 * 记录错误日志
 */
export async function logError(
  type: LogEntry['type'],
  message: string,
  data?: Record<string, unknown>
): Promise<void> {
  await addLog({ type, level: 'error', message, data });
}

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
