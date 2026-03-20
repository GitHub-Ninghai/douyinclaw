/**
 * 视觉浏览器代理
 * 使用 GLM-4V 视觉模型来理解页面并执行操作
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import fs from 'fs';
import path from 'path';

// 视觉 AI 配置
interface VisualAgentConfig {
  /** GLM API Key */
  apiKey: string;
  /** GLM API 端点 */
  apiEndpoint?: string;
  /** 模型名称 */
  model?: string;
  /** 浏览器会话存储路径 */
  sessionPath?: string;
  /** 操作延迟 (ms) */
  actionDelay?: number;
  /** 最大重试次数 */
  maxRetries?: number;
}

// 操作类型
type ActionType = 'click' | 'input' | 'scroll' | 'wait' | 'screenshot' | 'navigate' | 'done';

// 操作指令
interface Action {
  type: ActionType;
  /** 点击位置 (相对坐标 0-1) */
  position?: { x: number; y: number };
  /** 输入内容 */
  content?: string;
  /** 滚动方向 */
  direction?: 'up' | 'down';
  /** 滚动量 */
  amount?: number;
  /** 等待时间 */
  duration?: number;
  /** 导航 URL */
  url?: string;
  /** 描述 */
  description?: string;
}

// 视觉 AI 响应
interface VisualAIResponse {
  /** 理解的页面内容 */
  understanding: string;
  /** 下一步操作 */
  action: Action;
  /** 是否完成 */
  isComplete: boolean;
  /** 进度信息 */
  progress?: string;
}

/**
 * 视觉浏览器代理
 */
export class VisualBrowserAgent {
  private config: Required<VisualAgentConfig>;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  constructor(config: VisualAgentConfig) {
    this.config = {
      apiKey: config.apiKey,
      apiEndpoint: config.apiEndpoint || 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      model: config.model || 'glm-4v-flash',
      sessionPath: config.sessionPath || './data/browser-session',
      actionDelay: config.actionDelay || 500,
      maxRetries: config.maxRetries || 3,
    };
  }

  /**
   * 初始化浏览器
   */
  async initialize(): Promise<void> {
    console.log('[VisualAgent] 初始化浏览器...');

    // 创建会话目录
    const sessionDir = path.dirname(this.config.sessionPath);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    // 启动浏览器
    this.browser = await chromium.launch({
      headless: false, // 显示浏览器窗口
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
    });

    // 加载已保存的会话
    if (fs.existsSync(this.config.sessionPath)) {
      try {
        const storage = JSON.parse(fs.readFileSync(this.config.sessionPath, 'utf-8'));
        this.context = await this.browser.newContext({
          storageState: storage,
          viewport: { width: 1280, height: 800 },
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        });
        console.log('[VisualAgent] 已加载保存的会话');
      } catch (e) {
        console.log('[VisualAgent] 会话文件损坏，创建新会话');
        this.context = await this.browser.newContext({
          viewport: { width: 1280, height: 800 },
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        });
      }
    } else {
      this.context = await this.browser.newContext({
        viewport: { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });
    }

    this.page = await this.context.newPage();
    console.log('[VisualAgent] 浏览器初始化完成');
  }

  /**
   * 保存会话状态
   */
  async saveSession(): Promise<void> {
    if (!this.context) return;

    const storage = await this.context.storageState();
    fs.writeFileSync(this.config.sessionPath, JSON.stringify(storage, null, 2));
    console.log('[VisualAgent] 会话已保存');
  }

  /**
   * 截取当前页面
   */
  async captureScreenshot(): Promise<string> {
    if (!this.page) throw new Error('页面未初始化');

    const screenshot = await this.page.screenshot({ type: 'jpeg', quality: 80 });
    return screenshot.toString('base64');
  }

  /**
   * 调用视觉 AI 分析页面
   */
  async analyzePage(task: string, screenshot: string): Promise<VisualAIResponse> {
    const response = await fetch(this.config.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(),
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `当前任务: ${task}\n\n请分析当前页面截图，告诉我下一步该做什么操作。`,
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

    // 解析 AI 响应
    return this.parseAIResponse(content);
  }

  /**
   * 系统提示词
   */
  private getSystemPrompt(): string {
    return `你是一个视觉浏览器操作助手。你会收到页面截图和任务描述，然后决定下一步操作。

操作类型:
- click: 点击某个位置 (需要 position: {x, y}，相对坐标 0-1)
- input: 输入文字 (需要 content: "要输入的文字")
- scroll: 滚动页面 (需要 direction: "up" 或 "down", amount: 滚动量)
- wait: 等待 (需要 duration: 毫秒数)
- navigate: 导航到 URL (需要 url)
- done: 任务完成

请用 JSON 格式回复:
{
  "understanding": "我看到页面上有...",
  "action": { "type": "click", "position": { "x": 0.5, "y": 0.3 }, "description": "点击私信按钮" },
  "isComplete": false,
  "progress": "已找到私信入口，准备点击"
}

重要规则:
1. 坐标使用相对值 (0-1)，左上角是 (0,0)，右下角是 (1,1)
2. 每次只返回一个操作
3. 如果任务完成，设置 isComplete: true
4. 描述要清晰简洁`;
  }

  /**
   * 解析 AI 响应
   */
  private parseAIResponse(content: string): VisualAIResponse {
    try {
      // 尝试提取 JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as VisualAIResponse;
      }
    } catch (e) {
      console.log('[VisualAgent] JSON 解析失败，使用默认操作');
    }

    // 默认返回等待操作
    return {
      understanding: '无法解析 AI 响应',
      action: { type: 'wait', duration: 1000 },
      isComplete: false,
      progress: '等待中...',
    };
  }

  /**
   * 执行操作
   */
  async executeAction(action: Action): Promise<void> {
    if (!this.page) throw new Error('页面未初始化');

    console.log(`[VisualAgent] 执行操作: ${action.type} - ${action.description || ''}`);

    switch (action.type) {
      case 'click':
        if (action.position) {
          // 相对坐标转绝对坐标
          const x = action.position.x * 1280;
          const y = action.position.y * 800;
          await this.page.mouse.click(x, y);
        }
        break;

      case 'input':
        if (action.content) {
          await this.page.keyboard.type(action.content, { delay: 50 });
        }
        break;

      case 'scroll':
        const amount = action.amount || 200;
        const direction = action.direction === 'up' ? -amount : amount;
        await this.page.mouse.wheel(0, direction);
        break;

      case 'wait':
        await this.page.waitForTimeout(action.duration || 1000);
        break;

      case 'navigate':
        if (action.url) {
          await this.page.goto(action.url);
          await this.page.waitForLoadState('networkidle');
        }
        break;

      case 'done':
        console.log('[VisualAgent] 任务完成');
        break;
    }

    // 操作后延迟
    await this.page.waitForTimeout(this.config.actionDelay);
  }

  /**
   * 执行任务
   */
  async executeTask(task: string, maxSteps: number = 50): Promise<boolean> {
    console.log(`[VisualAgent] 开始执行任务: ${task}`);

    for (let step = 0; step < maxSteps; step++) {
      console.log(`[VisualAgent] 步骤 ${step + 1}/${maxSteps}`);

      try {
        // 截图
        const screenshot = await this.captureScreenshot();

        // 分析页面
        const response = await this.analyzePage(task, screenshot);

        console.log(`[VisualAgent] 理解: ${response.understanding}`);
        console.log(`[VisualAgent] 进度: ${response.progress || '进行中...'}`);

        // 执行操作
        await this.executeAction(response.action);

        // 保存会话
        await this.saveSession();

        // 检查是否完成
        if (response.isComplete) {
          console.log('[VisualAgent] 任务完成！');
          return true;
        }
      } catch (error) {
        console.error(`[VisualAgent] 步骤 ${step + 1} 出错:`, error);
        // 继续尝试
      }
    }

    console.log('[VisualAgent] 达到最大步骤数，任务可能未完成');
    return false;
  }

  /**
   * 导航到 URL
   */
  async navigate(url: string): Promise<void> {
    if (!this.page) throw new Error('页面未初始化');
    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await this.page.waitForLoadState('domcontentloaded', { timeout: 60000 });
  }

  /**
   * 获取当前 URL
   */
  getCurrentUrl(): string {
    if (!this.page) throw new Error('页面未初始化');
    return this.page.url();
  }

  /**
   * 关闭浏览器
   */
  async close(): Promise<void> {
    await this.saveSession();
    await this.browser?.close();
    this.browser = null;
    this.context = null;
    this.page = null;
    console.log('[VisualAgent] 浏览器已关闭');
  }
}

export default VisualBrowserAgent;
