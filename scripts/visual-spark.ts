/**
 * 抖音续火花脚本
 * 使用视觉 AI 自动操作浏览器完成续火花
 */

import { chromium, BrowserContext, Page } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM 环境下获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 已处理的好友记录
const processedFriends: Set<string> = new Set();

// 简单加载 .env 文件
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

// 调用 GLM-4V 视觉模型
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
    amount?: number;
    friendName?: string;
  };
  isComplete: boolean;
  progress?: string;
  friendIdentified?: string;
}> {
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
          content: `你是小火苗，帮主人续火花的 AI 助手。

已处理好友: ${processedList.length > 0 ? processedList.join(', ') : '无'}

【操作类型】
- hover: 鼠标悬停 {position:{x,y}}
- click: 点击 {position:{x,y}}
- input: 输入 {content:"文字"}
- scroll: 滚动 {amount:200}
- back: 返回
- wait: 等待
- done: 完成

【火花颜色】
- 灰色 = 需要续火花
- 彩色/橙色 = 已发过，跳过

【避免重复】看头像和昵称，已处理列表中的人跳过

【消息风格】介绍自己+幽默内容，如：
- "我是小火苗来续火花啦！今天也要元气满满~"
- "滴！小火苗打卡，今天开心吗？"

【视频回复】如果有视频先评论："哈哈这个逗"或"好厉害"

【坐标】页面1280x800，私信按钮约(1180,50)

【重要】必须只返回一个 JSON，不要其他文字！
{"understanding":"描述","action":{"type":"...","position":{"x":0,"y":0},"content":"..."},"isComplete":false,"progress":"进度","friendIdentified":"昵称"}`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `当前任务: ${task}\n\n请分析当前页面截图，告诉我下一步该做什么操作。`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${screenshot}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1024,
    }),
  });

  const data = await response.json() as { choices: Array<{ message: { content: string } }> };
  const content = data.choices?.[0]?.message?.content || '';
  console.log(`\n[AI 原始响应]\n${content}\n`);

  // 解析 JSON - 多种尝试方式
  try {
    // 方式1: 尝试直接解析整个响应
    try {
      return JSON.parse(content);
    } catch {}

    // 方式2: 找第一个完整的 JSON 对象
    const jsonMatch = content.match(/\{[\s\S]*?\}(?=\s*$|\s*[\n\r]*[^{},])/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    // 方式3: 找所有大括号内容，取最长的有效 JSON
    const allBraces = content.match(/\{[^{}]*\}/g);
    if (allBraces) {
      for (const match of allBraces) {
        try {
          const parsed = JSON.parse(match);
          if (parsed.action && parsed.understanding) {
            return parsed;
          }
        } catch {}
      }
    }

    // 方式4: 嵌套 JSON
    const nestedMatch = content.match(/\{[^{}]*\{[^{}]*\}[^{}]*\}/);
    if (nestedMatch) {
      try {
        return JSON.parse(nestedMatch[0]);
      } catch {}
    }

  } catch (e) {
    console.log('[JSON 解析失败，尝试从内容推断操作]');
  }

  // 尝试从文本推断操作
  if (content.includes('私信') && content.includes('悬停')) {
    return {
      understanding: '检测到需要悬停私信按钮',
      action: { type: 'hover', position: { x: 1180, y: 50 } },
      isComplete: false,
      progress: '悬停私信按钮'
    };
  }

  if (content.includes('完成') || content.includes('done')) {
    return {
      understanding: '任务完成',
      action: { type: 'done' },
      isComplete: true,
      progress: '所有好友已处理'
    };
  }

  return {
    understanding: '无法解析 AI 响应，使用默认等待',
    action: { type: 'wait', description: '等待' },
    isComplete: false,
    progress: '等待中...'
  };
}

async function main() {
  console.log('=== 抖音续火花 - 视觉 AI 模式 ===\n');
  console.log('🔥 你好！我是小火苗，主人的 AI 助手\n');

  // 加载环境变量
  loadEnv();

  // 检查配置
  if (!process.env.GLM_API_KEY) {
    console.error('错误: 请在 .env 文件中配置 GLM_API_KEY');
    console.log('\n获取 GLM API Key:');
    console.log('1. 访问 https://open.bigmodel.cn/');
    console.log('2. 注册账号并登录');
    console.log('3. 在控制台获取 API Key');
    console.log('4. 在 .env 文件中添加: GLM_API_KEY=your-key');
    process.exit(1);
  }

  console.log('正在初始化浏览器...');

  // 创建数据目录
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // 启动浏览器
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
    ],
  });

  let context: BrowserContext;
  const sessionPath = path.join(dataDir, 'douyin-session.json');

  // 加载已保存的会话
  if (fs.existsSync(sessionPath)) {
    try {
      const storage = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
      context = await browser.newContext({
        storageState: storage,
        viewport: { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });
      console.log('✓ 已加载保存的会话');
    } catch (e) {
      console.log('会话文件损坏，创建新会话');
      context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });
    }
  } else {
    context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
  }

  const page = await context.newPage();

  // 保存会话函数
  async function saveSession() {
    const storage = await context.storageState();
    fs.writeFileSync(sessionPath, JSON.stringify(storage, null, 2));
  }

  // 执行 hover 操作
  async function hoverAndWait(page: Page, x: number, y: number) {
    await page.mouse.move(x, y);
    await page.waitForTimeout(1000); // 等待面板弹出
  }

  // 执行返回操作
  async function goBack(page: Page) {
    // 尝试按 ESC 或点击返回区域
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  try {
    // 导航到抖音
    console.log('正在打开抖音网页版...');
    await page.goto('https://www.douyin.com');
    await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
    await page.waitForTimeout(2000);

    // 检查是否需要登录
    const currentUrl = page.url();
    if (currentUrl.includes('login') || await page.locator('text=登录').count() > 0) {
      console.log('\n⚠️  需要登录抖音账号！');
      console.log('请在浏览器中完成登录（扫码或密码登录）');
      console.log('登录完成后，按回车继续...\n');

      await new Promise(resolve => {
        process.stdin.once('data', resolve);
      });
      console.log('\n✓ 登录完成，开始执行任务...\n');
      await page.waitForTimeout(2000);
    } else {
      console.log('✓ 已登录，开始执行任务...\n');
    }

    // 执行续火花任务
    const task = `请执行续火花任务：
1. 将鼠标移动到右上角的"私信"按钮位置悬停（不要点击），等待私信面板弹出
2. 观察私信列表中的好友，注意看火花图标颜色：
   - 灰色火花 = 需要续火花
   - 彩色火花 = 今天已发过，跳过
3. 对于灰色火花的好友（且不在已处理列表中）：
   - 点击进入聊天
   - 如果有视频分享，先回复视频感受
   - 然后发送续火花消息（介绍自己是AI小火苗 + 幽默内容）
   - 返回列表
4. 继续处理下一个灰色火花好友
5. 所有好友处理完后报告完成`;

    let step = 0;
    const maxSteps = 150;
    let currentFriend: string | null = null;

    while (step < maxSteps) {
      step++;
      console.log(`\n${'='.repeat(40)}`);
      console.log(`[步骤 ${step}/${maxSteps}]`);
      console.log(`已处理好友: ${processedFriends.size > 0 ? Array.from(processedFriends).join(', ') : '无'}`);

      try {
        // 截图
        const screenshot = (await page.screenshot({ type: 'jpeg', quality: 80 })).toString('base64');

        // 分析页面
        const result = await analyzeWithVision(
          process.env.GLM_API_KEY!,
          screenshot,
          task,
          Array.from(processedFriends)
        );

        console.log(`[理解] ${result.understanding}`);
        console.log(`[进度] ${result.progress || '进行中...'}`);
        console.log(`[操作] ${result.action.type}${result.action.description ? ' - ' + result.action.description : ''}`);

        // 记录识别到的好友
        if (result.friendIdentified && !processedFriends.has(result.friendIdentified)) {
          currentFriend = result.friendIdentified;
          console.log(`[好友] 识别到: ${result.friendIdentified}`);
        }

        // 执行操作
        switch (result.action.type) {
          case 'hover':
            if (result.action.position) {
              await hoverAndWait(page, result.action.position.x, result.action.position.y);
            }
            break;

          case 'click':
            if (result.action.position) {
              await page.mouse.click(result.action.position.x, result.action.position.y);
              await page.waitForTimeout(1000);
            }
            break;

          case 'input':
            if (result.action.content) {
              // 先点击输入框确保焦点
              await page.waitForTimeout(500);
              await page.keyboard.type(result.action.content, { delay: 30 });
              await page.waitForTimeout(300);
              // 按回车发送
              await page.keyboard.press('Enter');
              console.log(`[发送] ${result.action.content}`);
              // 标记好友已处理
              if (currentFriend) {
                processedFriends.add(currentFriend);
                console.log(`[记录] 已处理: ${currentFriend}`);
                currentFriend = null;
              }
              await page.waitForTimeout(1000);
            }
            break;

          case 'scroll': {
            const scrollAmount = result.action.amount || 200;
            await page.mouse.wheel(0, scrollAmount);
            await page.waitForTimeout(500);
            break;
          }

          case 'back':
            await goBack(page);
            await page.waitForTimeout(1000);
            break;

          case 'wait':
            await page.waitForTimeout(2000);
            break;

          case 'done':
            console.log('\n' + '='.repeat(40));
            console.log('✅ 续火花任务完成！');
            console.log(`📊 共处理 ${processedFriends.size} 位好友`);
            if (processedFriends.size > 0) {
              console.log(`👥 好友列表: ${Array.from(processedFriends).join(', ')}`);
            }
            await saveSession();
            return;
        }

        // 保存会话
        await saveSession();

        // 检查是否完成
        if (result.isComplete) {
          console.log('\n' + '='.repeat(40));
          console.log('✅ 续火花任务完成！');
          console.log(`📊 共处理 ${processedFriends.size} 位好友`);
          return;
        }

        // 等待一下再继续
        await page.waitForTimeout(800);

      } catch (err) {
        console.error('[错误]', err);
        await page.waitForTimeout(2000);
      }
    }

    console.log('\n⚠️ 达到最大步骤数，任务可能未完全完成');
    console.log(`📊 已处理 ${processedFriends.size} 位好友`);

  } catch (error) {
    console.error('\n❌ 执行出错:', error);
  } finally {
    await saveSession();
    console.log('\n' + '='.repeat(40));
    console.log('--- 按 Ctrl+C 退出，或按回车关闭浏览器 ---');
    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });
    await browser.close();
  }
}

main();
