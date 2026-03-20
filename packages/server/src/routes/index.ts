/**
 * API 路由模块
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import statusRoutes from './status.js';
import loginRoutes from './login.js';
import friendsRoutes from './friends.js';
import sparkRoutes from './spark.js';
import replyRoutes from './reply.js';
import settingsRoutes from './settings.js';
import logsRoutes from './logs.js';
import messagePoolRoutes from './message-pool.js';

// 创建主应用
const app = new Hono();

// 中间件
app.use('*', logger());
app.use('*', cors({
  origin: process.env.CORS_ORIGIN || '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// 健康检查
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 注册路由
app.route('/api/status', statusRoutes);
app.route('/api/login', loginRoutes);
app.route('/api/friends', friendsRoutes);
app.route('/api/spark', sparkRoutes);
app.route('/api/reply', replyRoutes);
app.route('/api/settings', settingsRoutes);
app.route('/api/logs', logsRoutes);
app.route('/api/message-pool', messagePoolRoutes);

// 404 处理
app.notFound((c) => {
  return c.json({ success: false, error: 'Not Found' }, 404);
});

// 错误处理
app.onError((err, c) => {
  console.error('API Error:', err);
  return c.json({ success: false, error: err.message }, 500);
});

export default app;
