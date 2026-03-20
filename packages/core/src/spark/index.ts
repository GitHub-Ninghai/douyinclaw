/**
 * Spark 模块 - 火花续命
 */

export { SparkDetector, createSparkDetector, type SparkDetectorConfig } from './detector.js';
export { SparkKeeper, createSparkKeeper, type SparkKeeperConfig, type SendResult } from './keeper.js';
export {
  MessagePool,
  createMessagePool,
  getRandomSparkContent,
} from './messages.js';
