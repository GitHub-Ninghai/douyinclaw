# DouyinClaw

抖音社交助手 - 使用视觉 AI 自动续火花 + 智能回复

> **开发状态**: 项目正在积极开发中，部分功能尚未完成，欢迎 Star 关注进展

## 核心特性

- **视觉 AI 续火花** - 使用 GLM-4V 视觉模型理解页面，不依赖脆弱的选择器
- **AI 智能回复** - 收到视频分享时自动生成个性化回复
- **会话持久化** - 登录一次，永久保持
- **简单部署** - 单脚本运行，无需复杂配置

## 技术栈

- **视觉 AI**: GLM-4V (智谱 AI)
- **浏览器控制**: Playwright
- **前端**: Next.js 14 (可选)
- **后端**: Hono + SQLite (可选)

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，填写以下必需配置：

```env
# GLM API Key (必需)
GLM_API_KEY=your-glm-api-key

# 其他可选配置
AI_PROVIDER=glm
```

### 3. 运行续火花

```bash
# 视觉模式续火花
pnpm spark:visual

# 自动定时续火花
pnpm spark:auto
```

## 使用方式

### 方式一：命令行

```bash
# 首次运行会打开浏览器，扫码登录抖音
pnpm spark:visual

# 登录状态会自动保存，下次无需再次登录
```

### 方式二：Web 管理后台 (可选)

```bash
# 启动 Web 服务
pnpm dev

# 访问 http://localhost:3000
```

## 项目结构

```
DouyinClaw/
├── packages/
│   ├── core/               # 核心模块
│   │   └── src/browser/
│   │       └── visual-agent.ts  # 视觉浏览器代理 (核心)
│   ├── server/             # API 服务 (可选)
│   ├── web/                # 管理后台 (可选)
│   └── shared/             # 共享类型
├── scripts/
│   ├── visual-spark.ts     # 视觉续火花脚本
│   └── auto-spark.ts       # 自动定时脚本
├── data/
│   └── douyin-session.json # 登录会话存储
└── .env                    # 环境变量配置
```

## 核心模块：视觉浏览器代理

`VisualBrowserAgent` 是核心组件，使用视觉 AI 来理解和操作页面：

```typescript
import VisualBrowserAgent from '@douyinclaw/core/browser/visual-agent';

const agent = new VisualBrowserAgent({
  apiKey: process.env.GLM_API_KEY,
  model: 'glm-4v-flash',
});

await agent.initialize();
await agent.navigate('https://www.douyin.com');
await agent.executeTask('给所有好友发送消息续火花');
await agent.close();
```

## 为什么用视觉 AI？

| 传统方式 | 视觉 AI 方式 |
|---------|-------------|
| 依赖 CSS 选择器 | 理解页面视觉内容 |
| 页面改版就失效 | 适应任何页面变化 |
| 需要维护选择器 | 零维护 |
| 开发成本高 | 自然语言描述任务 |

## 获取 GLM API Key

1. 访问 [智谱 AI 开放平台](https://open.bigmodel.cn/)
2. 注册账号并登录
3. 在控制台获取 API Key
4. GLM-4V-Flash 模型免费使用

## 可选功能

### Web 管理后台

```bash
pnpm dev
# 访问 http://localhost:3000
```

功能：
- 查看续火花状态
- 配置发送时间
- 管理好友列表

### 飞书通知

在 `.env` 中配置：

```env
FEISHU_WEBHOOK_URL=https://open.feishu.cn/open-apis/bot/v2/hook/xxx
```

## 常见问题

### Q: 登录状态会过期吗？
A: 会话会自动保存，一般可以保持很长时间。过期后会提示重新登录。

### Q: 支持多账号吗？
A: 当前版本支持单账号，多账号功能计划中。

### Q: 免费吗？
A: GLM-4V-Flash 模型免费，续火花操作不产生费用。

## License

MIT
