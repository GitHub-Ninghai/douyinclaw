/**
 * 防检测策略模块
 * 实现各种随机化行为以模拟真人操作，避免被检测为自动化脚本
 */

/**
 * 随机数生成工具
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * 正态分布随机数（用于更自然的时间分布）
 */
export function gaussianRandom(mean: number, stdDev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * stdDev + mean;
}

/**
 * 贝塞尔曲线点生成
 * 用于生成自然的鼠标移动轨迹
 */
export interface Point {
  x: number;
  y: number;
}

export interface BezierCurve {
  start: Point;
  control1: Point;
  control2: Point;
  end: Point;
}

/**
 * 生成三次贝塞尔曲线上的点
 */
export function cubicBezierPoint(t: number, curve: BezierCurve): Point {
  const { start, control1, control2, end } = curve;
  const t2 = t * t;
  const t3 = t2 * t;
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;

  return {
    x:
      mt3 * start.x +
      3 * mt2 * t * control1.x +
      3 * mt * t2 * control2.x +
      t3 * end.x,
    y:
      mt3 * start.y +
      3 * mt2 * t * control1.y +
      3 * mt * t2 * control2.y +
      t3 * end.y,
  };
}

/**
 * 生成鼠标移动轨迹点
 * @param start 起始点
 * @param end 终点
 * @param steps 步数（越大越平滑）
 */
export function generateMousePath(
  start: Point,
  end: Point,
  steps: number = 20
): Point[] {
  // 计算两点之间的距离
  const distance = Math.sqrt(
    Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
  );

  // 根据距离调整控制点，使曲线更自然
  const offset = distance * 0.3;

  // 随机生成两个控制点
  const control1: Point = {
    x: start.x + (end.x - start.x) * randomFloat(0.2, 0.4) + randomFloat(-offset, offset),
    y: start.y + (end.y - start.y) * randomFloat(0.2, 0.4) + randomFloat(-offset, offset),
  };

  const control2: Point = {
    x: start.x + (end.x - start.x) * randomFloat(0.6, 0.8) + randomFloat(-offset, offset),
    y: start.y + (end.y - start.y) * randomFloat(0.6, 0.8) + randomFloat(-offset, offset),
  };

  const curve: BezierCurve = { start, control1, control2, end };

  // 生成曲线上的点，使用不均匀的 t 值使移动更自然
  const points: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    // 使用缓入缓出效果
    const t = easeInOutCubic(i / steps);
    points.push(cubicBezierPoint(t, curve));
  }

  return points;
}

/**
 * 缓入缓出函数
 */
function easeInOutCubic(t: number): number {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * 防检测配置
 */
export interface AntiDetectConfig {
  /** 打字速度范围 (ms/字符) */
  typingSpeed: { min: number; max: number };

  /** 操作间隔范围 (ms) */
  actionDelay: { min: number; max: number };

  /** 鼠标移动步数 */
  mouseSteps: { min: number; max: number };

  /** 滚动距离范围 (像素) */
  scrollDistance: { min: number; max: number };

  /** 页面停留时间范围 (ms) */
  pageStayTime: { min: number; max: number };
}

/**
 * 默认防检测配置
 */
export const defaultAntiDetectConfig: AntiDetectConfig = {
  typingSpeed: { min: 50, max: 150 },
  actionDelay: { min: 2000, max: 8000 },
  mouseSteps: { min: 15, max: 30 },
  scrollDistance: { min: 100, max: 500 },
  pageStayTime: { min: 3000, max: 10000 },
};

/**
 * 防检测工具类
 */
export class AntiDetect {
  private config: AntiDetectConfig;

  constructor(config: Partial<AntiDetectConfig> = {}) {
    this.config = { ...defaultAntiDetectConfig, ...config };
  }

  /**
   * 获取随机打字延迟
   */
  getRandomTypingDelay(): number {
    return randomInt(this.config.typingSpeed.min, this.config.typingSpeed.max);
  }

  /**
   * 获取随机操作间隔
   */
  getRandomActionDelay(): number {
    // 使用正态分布使大多数延迟在中间范围
    const delay = gaussianRandom(
      (this.config.actionDelay.min + this.config.actionDelay.max) / 2,
      (this.config.actionDelay.max - this.config.actionDelay.min) / 4
    );
    return Math.max(this.config.actionDelay.min, Math.min(this.config.actionDelay.max, delay));
  }

  /**
   * 获取随机鼠标移动步数
   */
  getRandomMouseSteps(): number {
    return randomInt(this.config.mouseSteps.min, this.config.mouseSteps.max);
  }

  /**
   * 获取随机滚动距离
   */
  getRandomScrollDistance(): number {
    return randomInt(this.config.scrollDistance.min, this.config.scrollDistance.max);
  }

  /**
   * 获取随机页面停留时间
   */
  getRandomPageStayTime(): number {
    return randomInt(this.config.pageStayTime.min, this.config.pageStayTime.max);
  }

  /**
   * 模拟人类打字
   * @param text 要输入的文本
   * @returns 每个字符的延迟时间数组
   */
  simulateTyping(text: string): number[] {
    const delays: number[] = [];
    for (let i = 0; i < text.length; i++) {
      // 偶尔添加较长的停顿（模拟思考）
      if (Math.random() < 0.1) {
        delays.push(this.getRandomTypingDelay() * randomInt(2, 4));
      } else {
        delays.push(this.getRandomTypingDelay());
      }
    }
    return delays;
  }

  /**
   * 生成随机滚动行为
   * @returns 滚动序列
   */
  generateScrollSequence(): { distance: number; delay: number }[] {
    const scrollCount = randomInt(2, 5);
    const sequence: { distance: number; delay: number }[] = [];

    for (let i = 0; i < scrollCount; i++) {
      sequence.push({
        distance: this.getRandomScrollDistance() * (Math.random() > 0.5 ? 1 : -1),
        delay: randomInt(500, 2000),
      });
    }

    return sequence;
  }
}

/**
 * 注入到页面的脚本，用于绕过 WebDriver 检测
 */
export const stealthScripts = `
  // 覆盖 navigator.webdriver 属性
  Object.defineProperty(navigator, 'webdriver', {
    get: () => undefined,
  });

  // 覆盖 navigator.plugins
  Object.defineProperty(navigator, 'plugins', {
    get: () => [1, 2, 3, 4, 5],
  });

  // 覆盖 navigator.languages
  Object.defineProperty(navigator, 'languages', {
    get: () => ['zh-CN', 'zh', 'en'],
  });

  // 覆盖 window.chrome
  window.chrome = {
    runtime: {},
  };

  // 覆盖 navigator.permissions
  const originalQuery = window.navigator.permissions.query;
  window.navigator.permissions.query = (parameters) =>
    parameters.name === 'notifications'
      ? Promise.resolve({ state: Notification.permission })
      : originalQuery(parameters);

  // 覆盖 WebGL 指纹
  const getParameter = WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter = function(parameter) {
    if (parameter === 37445) {
      return 'Intel Inc.';
    }
    if (parameter === 37446) {
      return 'Intel Iris OpenGL Engine';
    }
    return getParameter.call(this, parameter);
  };
`;

/**
 * 随机 User-Agent 列表
 */
export const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
];

/**
 * 获取随机 User-Agent
 */
export function getRandomUserAgent(): string {
  return userAgents[randomInt(0, userAgents.length - 1)] ?? userAgents[0]!;
}

/**
 * 随机视口大小列表
 */
export const viewports = [
  { width: 1920, height: 1080 },
  { width: 1680, height: 1050 },
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 1536, height: 864 },
];

/**
 * 获取随机视口大小
 */
export function getRandomViewport(): { width: number; height: number } {
  return viewports[randomInt(0, viewports.length - 1)] ?? viewports[0]!;
}
