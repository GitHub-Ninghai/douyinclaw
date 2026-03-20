/**
 * 系统状态路由
 */

import { Hono } from 'hono';
import { getSystemStatus } from '../services/status.js';

const app = new Hono();

/**
 * GET /api/status - 获取系统状态
 */
app.get('/', async (c) => {
  try {
    const status = await getSystemStatus();
    return c.json({ success: true, data: status });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

export default app;
