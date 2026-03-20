#!/usr/bin/env node

/**
 * 开发环境启动脚本
 */

const { spawn } = require('child_process');
const path = require('path');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

function log(message, color = 'white') {
  console.log(colors[color] + message + colors.reset);
}

function runCommand(command, options = {}) {
  const isWindows = process.platform === 'win32';
  const shell = isWindows ? true : false;

  const child = spawn(command, {
    shell,
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..'),
    ...options
  });

  return new Promise((resolve, reject) => {
    child.on('close', (code) => {
    if (code === 0) {
      resolve();
    } else {
      reject(new Error(`Command failed with code ${code}`));
    }
  });
  });
}

// 检查环境变量
function checkEnv() {
  const required = [
    'AI_PROVIDER',
  ];

  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    log(`Missing required environment variables: ${missing.join(', ')}`, 'yellow');
    log('Using default values for missing variables...', 'yellow');
  }
}

checkEnv();

// 启动 Redis (Docker 环境)
async function startRedis() {
  const isDocker = process.env.DOCKER_ENV === 'true';

  if (isDocker) {
    log('Running in Docker mode, skipping Redis startup...', 'cyan');
    return;
  }

  try {
    // 检查 Redis 是否已运行
    await runCommand('redis-cli ping');
    log('Redis is already running', 'green');
  } catch {
    log('Starting Redis...', 'yellow');
    // 在 Windows 上启动 Redis 需要手动安装
    if (process.platform === 'win32') {
      log('Please install Redis for Windows or use Docker', 'red');
      log('Download from: https://github.com/microsoftarchive/redis/releases');
      process.exit(1);
    } else {
      // 在 Unix/mac 上启动 Redis
      await runCommand('redis-server --daemonize yes');
      log('Redis started', 'green');
    }
  }
}

// 启动 API 服务
async function startAPI() {
  log('Starting API server...', 'cyan');

  const apiPath = path.join(__dirname, 'packages', 'server');
  const api = spawn('node', [apiPath, 'dist', 'index.js'], {
    stdio: 'inherit',
    cwd: apiPath,
    env: {
    ...process.env,
    NODE_ENV: 'development',
    API_PORT: process.env.API_PORT || '3001',
  }
  });

  api.stdout.on('data', (data) => {
    console.log(data.toString());
  });

  api.stderr.on('data', (data) => {
    console.error(data.toString());
  });

  api.on('close', (code) => {
    if (code === 0) {
      log(`API server stopped`, 'yellow');
    } else {
      log(`API server crashed with code ${code}`, 'red');
      process.exit(code);
    }
  });

  return new Promise((resolve, reject) => {
    api.on('error', (err) => {
    log(`Failed to start API server: ${err.message}`, 'red');
    reject(err);
    });
  });
}

// 启动 Web 服务
async function startWeb() {
  log('Starting Web server...', 'cyan');

  const webPath = path.join(__dirname, 'packages', 'web');
  const web = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    cwd: webPath,
    env: {
    ...process.env,
    NODE_ENV: 'development',
  }
  });

  web.stdout.on('data', (data) => {
    console.log(data.toString());
  });

  web.stderr.on('data', (data) => {
    console.error(data.toString());
  });

  web.on('close', (code) => {
    if (code === 0) {
      log(`Web server stopped`, 'yellow');
    } else {
      log(`Web server crashed with code ${code}`, 'red');
    }
  });

  return new Promise((resolve, reject) => {
    web.on('error', (err) => {
    log(`Failed to start Web server: ${err.message}`, 'red');
    reject(err);
    });
  });
}

// 主函数
async function main() {
  log('=== DouyinClaw Development Environment ===', 'magenta');

  try {
    // 启动 Redis
    await startRedis();

    // 启动 API 服务
    await startAPI();

    // 启动 Web 服务
    await startWeb();

    log('All services started successfully!', 'green');
    log('', 'green');
    log('Web: http://localhost:3000', 'cyan');
    log('API: http://localhost:3001', 'cyan');
    log('', 'green');
    log('Press Ctrl+C to stop all services', 'yellow');
  } catch (error) {
    log(`Failed to start services: ${error.message}`, 'red');
    process.exit(1);
  }
}

// 处理进程退出
process.on('SIGINT', () => {
  log('Shutting down services...', 'yellow');
  process.exit(0);
});
