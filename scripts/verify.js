#!/usr/bin/env node
/**
 * 项目完整性验证脚本
 */

const { execSync } = require('child_process');
const path = require('path');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message, color = 'green') {
  console.log(colors[color] + message + colors.reset);
}

function runCommand(command, cwd) {
  try {
    execSync(command, { stdio: 'inherit', cwd }, { encoding: 'utf-8' });
    log(`✓ ${command}`, 'green');
  } catch (error) {
    log(`✗ ${command}: ${error.message}`, 'red');
    process.exit(1);
  }
}

function checkFile(filePath, description) {
  const fullPath = path.resolve(__dirname, filePath);
  if (fs.existsSync(fullPath)) {
    log(`  ✓ ${description}`, 'green');
  } else {
    log(`  ✗ ${description} - File not found`, 'red');
  }
}

function main() {
  log('=== DouyinClaw 项目完整性验证 ===', 'cyan');
  log('');

  // 检查项目结构
  log('检查项目结构...', 'yellow');
  checkFile('package.json', 'Root package.json');
  checkFile('README.md', 'README.md');
  checkFile('.env.example', '.env.example');
  checkFile('docker-compose.yml', 'docker-compose.yml');
  checkFile('Dockerfile.api', 'Dockerfile.api');
  checkFile('Dockerfile.web', 'Dockerfile.web');

  // 检查 packages
    log('检查 packages...', 'yellow');
    const packages = ['shared', 'core', 'server', 'web', 'feishu'];
    packages.forEach(pkg => {
      checkFile(`packages/${pkg}/package.json`, `packages/${pkg}/package.json`);
      checkFile(`packages/${pkg}/tsconfig.json`, `packages/${pkg}/tsconfig.json`);
    });

  log('');
  log('=== 飀验证完成 ===', 'green');
}
