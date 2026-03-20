/**
 * Browser 模块 - 浏览器自动化
 */

// 浏览器客户端
export {
  BrowserClient,
  createBrowserClient,
  type BrowserClientConfig,
} from './client.js';

// 会话管理
export {
  SessionManager,
  createSessionManager,
  type SessionConfig,
  type SessionData,
  type LoginResult,
  type SessionStatus,
  type FriendInfo,
  type SendMessageResult,
} from './session.js';

// 防检测
export {
  AntiDetect,
  stealthScripts,
  getRandomUserAgent,
  getRandomViewport,
  type AntiDetectConfig,
  type Point,
} from './anti-detect.js';

// 选择器
export {
  douyinSelectors,
  xpathSelectors,
  getSelector,
  getAllSelectors,
  type Selectors,
  type SelectorConfig,
} from './selectors.js';
