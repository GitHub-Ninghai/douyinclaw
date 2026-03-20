# DouyinClaw 项目上下文

## 项目概述
DouyinClaw 是一个抖音社交助手，提供自动续火花和 AI 智能回复功能。

## 技术栈
- **前端**: Next.js 14 + React + TailwindCSS + SWR
- **后端**: Hono + Node.js
- **数据库**: SQLite + Drizzle ORM
- **任务队列**: BullMQ + Redis
- **浏览器自动化**: Playwright
- **AI**: Claude / GLM / Qwen / MiniMax

## 项目结构
```
DouyinClaw/
├── packages/
│   ├── shared/          # 共享类型定义
│   ├── core/            # 核心业务逻辑 (AI, 浏览器, 数据库, 火花, 回复)
│   ├── server/          # 后端 API (Hono)
│   ├── web/             # 前端 (Next.js)
│   └── feishu/          # 飞书机器人
├── scripts/             # 启动和验证脚本
├── docker-compose.yml
├── Dockerfile.api
├── Dockerfile.web
├── README.md
└── .env.example
```

## 当前状态 (2024-03-19)

### 已完成
- [x] Monorepo 项目结构 (turbo + pnpm)
- [x] TypeScript、ESLint 配置
- [x] 5 个包的完整实现 (shared, core, server, web, feishu)
- [x] BullMQ 任务队列
- [x] 多 AI 提供商支持
- [x] 浏览器自动化模块
- [x] Docker 配置文件
- [x] 项目启动脚本
- [x] README.md 文档

### 构建状态
- `pnpm build`: ✅ 成功
- `pnpm lint`: ✅ 通过

### 服务端口
- Web: http://localhost:3000
- API: http://localhost:3001
- Redis: localhost:6379

## Agent 团队

| Agent | 职责 | 状态 |
|-------|------|------|
| core-agent | 核心业务逻辑 | 已完成 |
| web-agent | 前端开发 | 已完成 |
| queue-agent | 任务队列 | 已完成 |
| browser-agent | 浏览器自动化 | 已完成 |
| ai-agent | AI 服务 | 已完成 |
| api-agent | 后端 API | 已完成 |

## 快速启动

```bash
# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 填写必要配置

# 启动 Redis (需要先安装)
docker run -d --name redis -p 6379:6379 redis

# 启动开发模式
pnpm dev

# 或分别启动
pnpm dev:api    # 仅 API
pnpm dev:web    # 仅 Web
```

## 常用命令

```bash
pnpm build      # 构建
pnpm lint       # 代码检查
pnpm test       # 测试
pnpm clean      # 清理

node scripts/verify.js    # 验证项目完整性
node scripts/check-env.js # 检查环境变量
```

## 待办事项

### 高优先级
- [ ] 配置 .env 文件 (AI API Key 等)
- [ ] 安装 Docker Desktop
- [ ] 启动 Redis 服务
- [ ] 安装 Playwright 浏览器 (`npx playwright install chromium`)

### 功能增强
- [ ] 飞书自动配置脚本 (浏览器自动化获取 webhook)
- [ ] 数据库迁移脚本
- [ ] 单元测试完善
- [ ] E2E 测试

## 注意事项
1. Windows 环境需要手动安装 Redis 或使用 Docker
2. 飞书通知功能需要配置 webhook
3. AI 功能需要配置对应的 API Key
4. 浏览器自动化需要安装 Playwright 浏览器

## 开发阶段进度

### Phase 1: 基础设施 ✅
- [x] 初始化 monorepo (turbo + pnpm)
- [x] 配置 TypeScript、ESLint、共享 tsconfig
- [x] 创建 packages/core、server、web、feishu 骨架
- [x] 配置环境变量管理 (.env.example)
- [x] 创建共享类型定义 (packages/shared/types.ts)

### Phase 2: 核心引擎 ✅
- [x] 浏览器自动化模块
- [x] AI 服务模块

### Phase 3: API + 前端 ✅
- [x] 后端 API
- [x] 管理后台

### Phase 4: 飞书集成 ✅
- [x] 飞书机器人基础功能

### Phase 5: 集成 & 部署 🔄
- [x] Docker 配置
- [ ] 端到端集成测试
- [ ] 部署验证

## 恢复上下文指南

下次进入项目时，可以说：
- "继续 DouyinClaw 项目开发"
- "查看项目状态"
- "运行 pnpm dev 启动项目"
