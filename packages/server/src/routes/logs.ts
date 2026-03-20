/**
 * 日志相关路由
 */

import { Hono } from 'hono';
import { getLogs, clearLogs } from '../services/logs.js';

const app = new Hono();

/**
 * GET /api/logs - 获取日志列表
 */
app.get('/', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1', 10);
    const pageSize = parseInt(c.req.query('pageSize') || '50', 10);
    const type = c.req.query('type') as 'spark' | 'reply' | 'system' | undefined;
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');

    const result = await getLogs({ page, pageSize, type, startDate, endDate });
    return c.json({ success: true, data: result });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

/**
 * DELETE /api/logs - 清除日志
 */
app.delete('/', async (c) => {
  try {
    const beforeDate = c.req.query('beforeDate');
    const result = await clearLogs(beforeDate);
    return c.json({ success: true, data: { deleted: result } });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

export default app;
