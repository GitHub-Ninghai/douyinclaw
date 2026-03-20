/**
 * 设置相关路由
 */

import { Hono } from 'hono';
import {
  getSettings,
  updateSettings,
  getAIProviders,
} from '../services/settings.js';
import type { AppSettings, AIProviderType } from '@douyinclaw/shared';

const app = new Hono();

/**
 * GET /api/settings - 获取所有设置
 */
app.get('/', async (c) => {
  try {
    const settings = await getSettings();
    return c.json({ success: true, data: settings });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

/**
 * PUT /api/settings - 更新设置
 */
app.put('/', async (c) => {
  try {
    const body = await c.req.json<Partial<AppSettings>>();
    const settings = await updateSettings(body);
    return c.json({ success: true, data: settings });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

/**
 * GET /api/settings/ai-providers - 获取可用的 AI 提供商列表
 */
app.get('/ai-providers', async (c) => {
  try {
    const providers = await getAIProviders();
    return c.json({ success: true, data: providers });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

/**
 * PUT /api/settings/ai-provider - 更新 AI 提供商设置
 */
app.put('/ai-provider', async (c) => {
  try {
    const body = await c.req.json<{
      provider: AIProviderType;
      model?: string;
      maxTokens?: number;
      temperature?: number;
    }>();

    const settings = await updateSettings({
      aiProvider: body.provider,
      aiModel: body.model,
      aiMaxTokens: body.maxTokens,
    });

    return c.json({ success: true, data: settings });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

export default app;
