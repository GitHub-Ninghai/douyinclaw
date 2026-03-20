#!/usr/bin/env node
/**
 * 环境变量检查工具
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', '.env.example');

// 颜色
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

// 读取 .env.example 获取所有可配置项
function getExampleEnvVars() {
  const content = fs.readFileSync(envExamplePath, 'utf-8');
  const vars = {};

  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key] = trimmed.split('=');
      if (key) {
        vars[key[0]] = true;
      }
    }
  });

  return vars;
}

// 读取 .env 文件
function getEnvVars() {
  if (!fs.existsSync(envPath)) {
    return null;
  }

  const content = fs.readFileSync(envPath, 'utf-8');
  const vars = {};

  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, value] = trimmed.split('=');
      if (key) {
        vars[key[0]] = value || '';
      }
    }
  });

  return vars;
}

// 检查环境变量
function checkEnv() {
  console.log('\n=== 环境变量检查 ===\n');

  // 检查 .env 文件是否存在
  if (!fs.existsSync(envPath)) {
    console.log(colors.red + '错误: .env 文件不存在' + colors.reset);
    console.log(colors.yellow + '请复制 .env.example 为 .env 并填写配置\n');
    process.exit(1);
  }

  console.log(colors.green + '✓ .env 文件存在\n');

  const exampleVars = getExampleEnvVars();
  const envVars = getEnvVars();

  // 必需配置
  const required = [
    'AI_PROVIDER',
    'ANTHROPIC_API_KEY',
    'GLM_API_KEY',
    'QWEN_API_KEY',
    'MINIMAX_API_KEY',
  ];

  // 可选配置
  const optional = [
    'API_PORT',
    'WEB_PORT',
    'REDIS_URL',
    'FEISHU_WEBHOOK_URL',
  ];

  // 检查必需配置
  let hasErrors = false;

  console.log('\n=== 必需配置检查 ===\n');

  required.forEach(key => {
    const value = envVars[key];
    if (!value || value === 'xxxxx' || value.includes('your-') || value.includes('change-me')) {
      console.log(colors.red + `✗ ${key}: 未配置或使用默认值`);
      hasErrors = true;
    } else {
      // 飀 API Key 进行简单脱敏
      const maskedValue = value.length > 10
        ? value.substring(0, 6) + '...' + value.substring(value.length - 4)
        : value;
      console.log(colors.green + `✓ ${key}: ${maskedValue}`);
    }
  });

  console.log('\n=== 可选配置检查 ===\n');

  optional.forEach(key => {
    const value = envVars[key];
    if (!value) {
      console.log(colors.yellow + `⚠ ${key}: 未设置，使用默认值`);
    } else {
      console.log(colors.green + `✓ ${key}: ${value}`);
    }
  });

  console.log('');

  if (hasErrors) {
    console.log(colors.red + '\n❌ 磀境变量检查失败\n');
    console.log(colors.yellow + '请编辑 .env 文件并填写必需的配置\n');
    process.exit(1);
  } else {
    console.log(colors.green + '\n✅ 环境变量检查通过\n');
  }
}

// 主函数
checkEnv();
