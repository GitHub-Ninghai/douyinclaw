/**
 * 登录状态路由
 */

import { Hono } from 'hono';
import { getLoginStatus, checkLogin } from '../services/login.js';

const app = new Hono();

/**
 * GET /api/login/status - 获取登录状态
 */
app.get('/status', async (c) => {
  try {
    const status = await getLoginStatus();
    return c.json({ success: true, data: status });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

/**
 * POST /api/login/check - 检查登录状态
 */
app.post('/check', async (c) => {
  try {
    const result = await checkLogin();
    return c.json({ success: true, data: result });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

export default app;
