/**
 * 浏览器客户端模块
 * 初始化 Playwright Chromium 实例，支持 headless 和 headful 模式
 */

import { chromium, Browser, BrowserContext, Page, LaunchOptions } from 'playwright';
import { AntiDetect, stealthScripts, getRandomUserAgent, getRandomViewport } from './anti-detect.js';

const LOG_PREFIX = '[Browser]';

/**
 * 浏览器客户端配置
 */
export interface BrowserClientConfig {
  /** 是否使用无头模式 */
  headless: boolean;

  /** 用户数据目录（用于持久化会话） */
  userDataDir?: string;

  /** 代理配置 */
  proxy?: {
    server: string;
    username?: string;
    password?: string;
  };

  /** 自定义 User-Agent */
  userAgent?: string;

  /** 自定义视口大小 */
  viewport?: { width: number; height: number };

  /** 语言设置 */
  locale?: string;

  /** 时区设置 */
  timezone?: string;

  /** 启用防检测 */
  enableStealth?: boolean;

  /** 超时时间 (ms) */
  timeout?: number;

  /** 慢动作延迟（调试用） */
  slowMo?: number;
}

/**
 * 默认配置
 */
const defaultConfig: BrowserClientConfig = {
  headless: false,
  locale: 'zh-CN',
  timezone: 'Asia/Shanghai',
  enableStealth: true,
  timeout: 30000,
};

/**
 * 浏览器客户端类
 */
export class BrowserClient {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private config: BrowserClientConfig;
  private antiDetect: AntiDetect;
  private isInitialized = false;

  constructor(config: Partial<BrowserClientConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.antiDetect = new AntiDetect();
  }

  /**
   * 初始化浏览器
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log(`${LOG_PREFIX} 浏览器已初始化`);
      return;
    }

    try {
      console.log(`${LOG_PREFIX} 正在初始化浏览器...`);

      const launchOptions: LaunchOptions = {
        headless: this.config.headless,
        slowMo: this.config.slowMo,
        timeout: this.config.timeout,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-infobars',
          '--disable-dev-shm-usage',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
        ],
      };

      // 添加代理配置
      if (this.config.proxy) {
        launchOptions.proxy = this.config.proxy;
      }

      // 启动浏览器
      this.browser = await chromium.launch(launchOptions);

      // 创建浏览器上下文
      const contextOptions: Parameters<Browser['newContext']>[0] = {
        userAgent: this.config.userAgent || getRandomUserAgent(),
        viewport: this.config.viewport || getRandomViewport(),
        locale: this.config.locale,
        timezoneId: this.config.timezone,
        // 设置权限
        permissions: ['geolocation', 'notifications'],
        // 忽略 HTTPS 错误
        ignoreHTTPSErrors: true,
        // 记录 har 文件（调试用）
        recordHar: this.config.headless ? undefined : { path: 'debug.har' },
      };

      // 如果指定了用户数据目录，使用持久化上下文
      if (this.config.userDataDir) {
        this.context = await chromium.launchPersistentContext(
          this.config.userDataDir,
          {
            ...launchOptions,
            ...contextOptions,
          }
        );
      } else {
        this.context = await this.browser.newContext(contextOptions);
      }

      // 注入防检测脚本
      if (this.config.enableStealth) {
        await this.context.addInitScript(stealthScripts);
      }

      // 创建页面
      this.page = await this.context.newPage();

      // 设置默认超时
      this.page.setDefaultTimeout(this.config.timeout || 30000);
      this.page.setDefaultNavigationTimeout(this.config.timeout || 30000);

      this.isInitialized = true;
      console.log(`${LOG_PREFIX} 浏览器初始化完成`);
    } catch (error) {
      console.error(`${LOG_PREFIX} 浏览器初始化失败:`, error);
      throw error;
    }
  }

  /**
   * 获取当前页面
   */
  getPage(): Page {
    if (!this.page) {
      throw new Error('浏览器未初始化，请先调用 initialize()');
    }
    return this.page;
  }

  /**
   * 获取浏览器上下文
   */
  getContext(): BrowserContext {
    if (!this.context) {
      throw new Error('浏览器未初始化，请先调用 initialize()');
    }
    return this.context;
  }

  /**
   * 获取浏览器实例
   */
  getBrowser(): Browser {
    if (!this.browser) {
      throw new Error('浏览器未初始化，请先调用 initialize()');
    }
    return this.browser;
  }

  /**
   * 导航到指定 URL
   */
  async navigate(url: string): Promise<void> {
    const page = this.getPage();
    console.log(`${LOG_PREFIX} 正在导航到: ${url}`);

    try {
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: this.config.timeout,
      });

      // 等待页面稳定
      await this.waitForPageStable();
    } catch (error) {
      console.error(`${LOG_PREFIX} 导航失败:`, error);
      throw error;
    }
  }

  /**
   * 等待页面稳定
   */
  private async waitForPageStable(): Promise<void> {
    const page = this.getPage();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
  }

  /**
   * 截图
   */
  async screenshot(options?: { fullPage?: boolean; path?: string }): Promise<Buffer> {
    const page = this.getPage();
    console.log(`${LOG_PREFIX} 正在截图...`);

    const screenshotOptions = {
      fullPage: options?.fullPage ?? false,
      path: options?.path,
    };

    if (options?.path) {
      await page.screenshot(screenshotOptions);
      return Buffer.from('');
    }

    return await page.screenshot({ ...screenshotOptions, path: undefined });
  }

  /**
   * 等待选择器出现
   */
  async waitForSelector(
    selector: string,
    options?: { timeout?: number; state?: 'attached' | 'detached' | 'visible' | 'hidden' }
  ): Promise<void> {
    const page = this.getPage();
    await page.waitForSelector(selector, {
      timeout: options?.timeout || 10000,
      state: options?.state || 'visible',
    });
  }

  /**
   * 安全地点击元素（带等待和防检测）
   */
  async safeClick(selector: string): Promise<void> {
    const page = this.getPage();

    try {
      // 等待元素可见
      await this.waitForSelector(selector);

      // 随机延迟
      await page.waitForTimeout(this.antiDetect.getRandomActionDelay() / 10);

      // 点击
      await page.click(selector);

      console.log(`${LOG_PREFIX} 点击元素: ${selector}`);
    } catch (error) {
      console.error(`${LOG_PREFIX} 点击失败: ${selector}`, error);
      throw error;
    }
  }

  /**
   * 安全地输入文本（带防检测的打字模拟）
   */
  async safeType(selector: string, text: string): Promise<void> {
    const page = this.getPage();

    try {
      // 等待元素可见
      await this.waitForSelector(selector);

      // 聚焦输入框
      await page.focus(selector);

      // 清空现有内容
      await page.fill(selector, '');

      // 模拟人类打字
      const typingDelays = this.antiDetect.simulateTyping(text);

      for (let i = 0; i < text.length; i++) {
        await page.type(selector, text[i]!, { delay: typingDelays[i]! });
      }

      console.log(`${LOG_PREFIX} 输入文本: ${text.substring(0, 20)}...`);
    } catch (error) {
      console.error(`${LOG_PREFIX} 输入失败: ${selector}`, error);
      throw error;
    }
  }

  /**
   * 模拟鼠标移动
   */
  async moveMouse(x: number, y: number): Promise<void> {
    const page = this.getPage();

    try {
      // 获取当前位置
      const steps = this.antiDetect.getRandomMouseSteps();

      // 直接移动（简化版，实际可以结合贝塞尔曲线）
      await page.mouse.move(x, y, { steps });

      console.log(`${LOG_PREFIX} 鼠标移动到: (${x}, ${y})`);
    } catch (error) {
      console.error(`${LOG_PREFIX} 鼠标移动失败`, error);
      throw error;
    }
  }

  /**
   * 模拟页面滚动
   */
  async scrollPage(direction: 'up' | 'down' = 'down'): Promise<void> {
    const page = this.getPage();

    try {
      const scrollSequence = this.antiDetect.generateScrollSequence();

      for (const scroll of scrollSequence) {
        const distance = direction === 'down' ? Math.abs(scroll.distance) : -Math.abs(scroll.distance);
        await page.evaluate((d: number) => {
          (globalThis as unknown as { scrollBy: (x: number, y: number) => void }).scrollBy(0, d);
        }, distance);

        await page.waitForTimeout(scroll.delay);
      }

      console.log(`${LOG_PREFIX} 页面滚动: ${direction}`);
    } catch (error) {
      console.error(`${LOG_PREFIX} 滚动失败`, error);
      throw error;
    }
  }

  /**
   * 执行脚本
   */
  async evaluate<T>(fn: () => T): Promise<T> {
    const page = this.getPage();
    return await page.evaluate(fn);
  }

  /**
   * 等待随机时间
   */
  async randomWait(): Promise<void> {
    const page = this.getPage();
    await page.waitForTimeout(this.antiDetect.getRandomActionDelay());
  }

  /**
   * 关闭浏览器
   */
  async close(): Promise<void> {
    console.log(`${LOG_PREFIX} 正在关闭浏览器...`);

    try {
      if (this.page) {
        await this.page.close().catch(() => {});
        this.page = null;
      }

      if (this.context) {
        await this.context.close().catch(() => {});
        this.context = null;
      }

      if (this.browser) {
        await this.browser.close().catch(() => {});
        this.browser = null;
      }

      this.isInitialized = false;
      console.log(`${LOG_PREFIX} 浏览器已关闭`);
    } catch (error) {
      console.error(`${LOG_PREFIX} 关闭浏览器时出错:`, error);
    }
  }

  /**
   * 检查浏览器是否已初始化
   */
  isReady(): boolean {
    return this.isInitialized && this.page !== null && !this.page.isClosed();
  }

  /**
   * 获取当前 URL
   */
  getCurrentUrl(): string {
    const page = this.getPage();
    return page.url();
  }
}

/**
 * 创建浏览器客户端实例
 */
export function createBrowserClient(config?: Partial<BrowserClientConfig>): BrowserClient {
  return new BrowserClient(config);
}
