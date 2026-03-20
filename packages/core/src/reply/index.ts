/**
 * Reply 模块 - 智能回复
 */

export {
  Responder,
  getResponder,
  resetResponder,
  processVideoShare,
  type ResponderConfig,
} from './responder.js';

export {
  MessageMonitor,
  createMessageMonitor,
  type MonitorConfig,
  type UnreadConversation,
} from './monitor.js';

export {
  VideoParser,
  createVideoParser,
  type VideoParserConfig,
  type ParseResult,
} from './video-parser.js';
