/**
 * 抖音续火花脚本
 * 使用视觉 AI 自动操作浏览器完成续火花
 */

import { chromium, BrowserContext, Page, Browser } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 已处理的好友记录
const processedFriends: Set<string> = new Set();

// 当前状态
let currentState: 'idle' | 'panel_open' | 'in_chat' = 'idle';

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...values] = trimmed.split('=');
        if (key && values.length > 0) {
          process.env[key.trim()] = values.join('=').trim();
        }
      }
    });
  }
}

async function analyzeWithVision(
  apiKey: string,
  screenshot: string,
  task: string,
  processedList: string[]
): Promise<{
  understanding: string;
  action: {
    type: string;
    position?: { x: number; y: number };
    content?: string;
    description?: string;
  };
  isComplete: boolean;
  progress?: string;
  friendIdentified?: string;
}> {
  try {
    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'glm-4v-flash',
        messages: [
          {
            role: 'system',
            content: `你是小火苗，帮主人续火花的AI。

已处理好友: ${processedList.length > 0 ? processedList.join(', ') : '无'}
当前状态: ${currentState}

【操作类型】
- hover: 鼠标悬停到私信按钮，等待面板弹出
- click: 点击某个位置
- input: 在输入框输入文字并发送
- back: 返回好友列表
- done: 所有好友都处理完了

【重要规则】
1. 火花图标颜色：灰色=需要续火花，彩色/橙色=今天已发过跳过
2. 不要重复处理同一个好友（看头像和昵称区分）
3. 发消息要有趣，示例："我是主人的AI小火苗，来续火花啦！今天开心吗？"

【页面坐标】
- 页面大小: 1280 x 800
- 私信按钮在右上角约 (1180, 50)
- 私信面板弹出后，好友列表在右侧

【回复格式】必须只返回JSON:
{"understanding":"描述页面内容","action":{"type":"click","position":{"x":100,"y":200}},"isComplete":false,"progress":"进度","friendIdentified":"好友昵称"}`
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: task },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${screenshot}` } },
            ],
          },
        ],
        max_tokens: 512,
      }),
    });

    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    const content = data.choices?.[0]?.message?.content || '';
    console.log(`[AI响应] ${content.substring(0, 300)}`);

    // 尝试解析JSON
    try {
      // 尝试直接解析
      const parsed = JSON.parse(content);
      if (parsed.action) return parsed;
    } catch {}

    // 尝试提取JSON块
    const jsonMatch = content.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {}
    }

    return {
      understanding: 'JSON解析失败，请重试',
      action: { type: 'wait' },
      isComplete: false
    };
  } catch (error) {
    console.error('[API错误]', error);
    return {
      understanding: 'API调用失败',
      action: { type: 'wait' },
      isComplete: false
    };
  }
}

async function main() {
  console.log('🔥 抖音续火花 - 视觉 AI 模式\n');

  loadEnv();

  if (!process.env.GLM_API_KEY) {
    console.error('❌ 请在 .env 文件中配置 GLM_API_KEY');
    process.exit(1);
  }

  console.log('初始化浏览器...');
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  let browser: Browser | null = null;
  let context: BrowserContext;
  const sessionPath = path.join(dataDir, 'douyin-session.json');

  try {
    browser = await chromium.launch({
      headless: false,
      args: ['--disable-blink-features=AutomationControlled'],
    });

    // 加载或创建会话
    if (fs.existsSync(sessionPath)) {
      try {
        const storage = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
        context = await browser.newContext({
          storageState: storage,
          viewport: { width: 1280, height: 800 },
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
        });
        console.log('✓ 已加载保存的会话');
      } catch {
        context = await browser.newContext({
          viewport: { width: 1280, height: 800 },
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
        });
      }
    } else {
      context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
      });
    }

    const page = await context.newPage();

    // 保存会话
    const saveSession = async () => {
      try {
        const storage = await context.storageState();
        fs.writeFileSync(sessionPath, JSON.stringify(storage, null, 2));
      } catch (e) {
        console.log('保存会话失败:', e);
      }
    };

    console.log('打开抖音...');
    await page.goto('https://www.douyin.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    // 检查登录
    const currentUrl = page.url();
    if (currentUrl.includes('login') || await page.locator('text=登录').count() > 0) {
      console.log('\n⚠️  需要登录！');
      console.log('请在浏览器中扫码登录，完成后按回车继续...\n');
      await new Promise(resolve => process.stdin.once('data', resolve));
      console.log('✓ 继续执行...\n');
      await page.waitForTimeout(2000);
    }

    console.log('✓ 开始续火花任务\n');

    // 步骤1: 悬停私信按钮
    console.log('[1] 悬停私信按钮...');
    await page.mouse.move(1180, 50);
    await page.waitForTimeout(2000);
    currentState = 'panel_open';

    const maxSteps = 80;
    let step = 0;

    while (step < maxSteps) {
      step++;
      console.log(`\n${'='.repeat(40)}`);
      console.log(`[步骤 ${step}/${maxSteps}] 状态: ${currentState} | 已处理: ${processedFriends.size} 人`);

      try {
        // 截图
        console.log('  📸 截图中...');
        const screenshot = (await page.screenshot({ type: 'jpeg', quality: 60 })).toString('base64');

        // AI分析
        const result = await analyzeWithVision(
          process.env.GLM_API_KEY!,
          screenshot,
          `分析当前页面，状态:${currentState}，决定下一步操作。如果是私信面板，找到灰色火花的好友点击；如果是聊天界面，输入有趣的续火花消息。`,
          Array.from(processedFriends)
        );

        console.log(`  👁 理解: ${result.understanding}`);
        console.log(`  🎯 操作: ${result.action.type}${result.action.description ? ' - ' + result.action.description : ''}`);
        if (result.friendIdentified) {
          console.log(`  👤 好友: ${result.friendIdentified}`);
        }

        // 执行操作
        switch (result.action.type) {
          case 'hover':
            if (result.action.position) {
              await page.mouse.move(result.action.position.x, result.action.position.y);
              await page.waitForTimeout(1500);
              currentState = 'panel_open';
            }
            break;

          case 'click':
            if (result.action.position) {
              await page.mouse.click(result.action.position.x, result.action.position.y);
              await page.waitForTimeout(1500);

              if (currentState === 'panel_open') {
                currentState = 'in_chat';
                if (result.friendIdentified) {
                  processedFriends.add(result.friendIdentified);
                  console.log(`  ✅ 记录好友: ${result.friendIdentified}`);
                }
              }
            }
            break;

          case 'input':
            if (result.action.content) {
              // 点击输入框区域
              await page.mouse.click(850, 700);
              await page.waitForTimeout(500);

              // 输入文字
              await page.keyboard.type(result.action.content, { delay: 50 });
              await page.waitForTimeout(500);

              // 发送
              await page.keyboard.press('Enter');
              console.log(`  📤 发送: "${result.action.content}"`);
              await page.waitForTimeout(1500);
            }
            break;

          case 'back':
            await page.keyboard.press('Escape');
            await page.waitForTimeout(1000);
            // 重新悬停私信
            await page.mouse.move(1180, 50);
            await page.waitForTimeout(1500);
            currentState = 'panel_open';
            break;

          case 'done':
            console.log('\n✅ 任务完成！');
            await saveSession();
            return;
        }

        if (result.isComplete) {
          console.log('\n✅ 所有好友已处理！');
          await saveSession();
          return;
        }

        await saveSession();
        await page.waitForTimeout(800);

      } catch (err) {
        console.error('  ❌ 错误:', err);
        await page.waitForTimeout(2000);
      }
    }

    console.log('\n⚠️ 达到最大步骤数');

  } catch (error) {
    console.error('\n❌ 执行出错:', error);
  } finally {
    // 保存会话
    if (browser) {
      try {
        const contexts = browser.contexts();
        for (const ctx of contexts) {
          const storage = await ctx.storageState();
          fs.writeFileSync(sessionPath, JSON.stringify(storage, null, 2));
        }
      } catch (e) {
        console.log('保存会话时出错:', e);
      }

      console.log('\n按回车关闭浏览器...');
      await new Promise(resolve => process.stdin.once('data', resolve));
      await browser.close();
    }
  }
}

main();
