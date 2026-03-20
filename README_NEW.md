# DouyinClaw

> 基于 AI 智能体的抖音社交助手 - 参考 ScienceClaw 架构重新设计

## 特性

- 🔒 **安全隔离** - 完全运行在 Docker 容器中
- 👁️ **完全透明** - 每一步操作可追踪、可审计
- 🚀 **即开即用** - 一键启动完整环境
- 🤖 **多智能体** - 基于 LangGraph 的多智能体协作系统
- 🔧 **工具系统** - 四层工具架构，支持自定义扩展
- 📝 **技能系统** - SKILL.md 定义复杂工作流

## 架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           DouyinClaw Architecture                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                  │
│  │   Frontend  │    │   Backend   │    │   Sandbox   │                  │
│  │  (Next.js)  │◄──►│ (FastAPI)   │◄──►│ (Playwright)│                  │
│  │   :3000     │    │   :3001     │    │   :9222     │                  │
│  └─────────────┘    └──────┬──────┘    └─────────────┘                  │
│                            │                                             │
│         ┌──────────────────┼──────────────────┐                         │
│         ▼                  ▼                  ▼                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                  │
│  │Task Service │    │  WebSearch  │    │   MongoDB   │                  │
│  │  (Cron)     │    │  (SearXNG)  │    │   :27017    │                  │
│  │   :3002     │    │   :8888     │    │             │                  │
│  └─────────────┘    └─────────────┘    └─────────────┘                  │
│                            │                                             │
│                     ┌──────┴──────┐                                     │
│                     ▼             ▼                                     │
│              ┌──────────┐  ┌──────────┐                                 │
│              │  Redis   │  │  Feishu  │                                 │
│              │  :6379   │  │  Webhook │                                 │
│              └──────────┘  └──────────┘                                 │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## 智能体系统

### Agent 类型

| Agent | 职责 | 模型 |
|-------|------|------|
| **PlannerAgent** | 任务分解、策略规划 | GPT-4 / Claude |
| **VisionAgent** | 截图分析、页面理解 | GLM-4V / Claude Vision |
| **ChatAgent** | 消息生成、对话回复 | GPT-4 / GLM-4 |
| **ToolAgent** | 工具调用、操作执行 | GPT-4 |

## 工具系统

四层工具架构：

```
Layer 1: Built-in Tools (内置工具)
├── web_search     - 网页搜索
├── screenshot     - 页面截图
└── browser_control - 浏览器控制

Layer 2: Douyin Tools (抖音工具集)
├── get_friends    - 获取好友列表
├── check_spark    - 检测火花状态
├── send_message   - 发送消息
├── get_messages   - 获取消息列表
└── like_video     - 点赞视频

Layer 3: Sandbox Tools (沙箱工具)
├── read_file      - 读取文件
├── write_file     - 写入文件
├── execute_code   - 执行代码
└── shell_command  - Shell 命令

Layer 4: Custom Tools (自定义工具)
└── @tool 装饰器 - 用户自定义，热加载
```

## 技能系统

内置技能：

| 技能 | 描述 |
|------|------|
| **spark-keeper** | 自动续火花 |
| **smart-reply** | 智能回复私信 |
| **video-analyzer** | 视频内容分析 |
| **tool-creator** | 自然语言创建工具 |

## 快速启动

### 前置要求

- Docker & Docker Compose
- 推荐系统内存 ≥ 8 GB

### 启动

```bash
# 克隆项目
git clone https://github.com/xxx/DouyinClaw.git
cd DouyinClaw

# 配置环境变量
cp .env.example .env
# 编辑 .env 填写 API Key

# 启动 (首次需要构建)
docker compose -f docker-compose.new.yml up -d --build

# 查看日志
docker compose -f docker-compose.new.yml logs -f backend
```

### 访问

- 前端: http://localhost:3000
- API: http://localhost:3001
- 搜索: http://localhost:8888

## 项目结构

```
DouyinClaw/
├── docker-compose.new.yml    # Docker 编排
├── Tools/                    # 自定义工具 (热加载)
├── Skills/                   # 技能包
│   ├── spark-keeper/
│   ├── smart-reply/
│   ├── video-analyzer/
│   └── tool-creator/
├── workspace/                # 工作空间
├── docs/
│   └── ARCHITECTURE.md       # 架构文档
│
└── packages/
    ├── backend/              # 后端服务 (FastAPI)
    │   ├── deepagent/        # 智能体引擎
    │   ├── tools/            # 工具系统
    │   └── main.py
    │
    ├── sandbox/              # 沙箱服务
    │   ├── browser/          # 浏览器自动化
    │   ├── executor/         # 代码执行器
    │   └── main.py
    │
    ├── task-service/         # 任务调度
    │   └── main.py
    │
    └── frontend/             # 前端 (Next.js)
```

## 环境变量

```bash
# AI API Keys
GLM_API_KEY=your_glm_api_key
OPENAI_API_KEY=your_openai_api_key

# Database
MONGODB_URI=mongodb://admin:admin123@mongodb:27017/douyinclaw

# Redis
REDIS_URL=redis://redis:6379

# Services
SANDBOX_URL=ws://sandbox:9222
BACKEND_URL=http://backend:3001
```

## 开发

```bash
# 后端开发
cd packages/backend
pip install -r requirements.txt
python main.py

# 沙箱开发
cd packages/sandbox
pip install -r requirements.txt
python main.py

# 任务服务开发
cd packages/task-service
pip install -r requirements.txt
python main.py
```

## 与原版对比

| 维度 | 原版 DouyinClaw | 新版 DouyinClaw |
|------|-----------------|-----------------|
| **架构** | 简单脚本 | 微服务架构 (7个服务) |
| **智能体** | 无 | LangGraph 多智能体系统 |
| **工具系统** | 无 | 四层工具架构 |
| **技能系统** | 无 | SKILL.md 工作流定义 |
| **沙箱** | 无 | Docker 隔离 |
| **部署** | 手动启动 | 一键 Docker Compose |

## 参考

- [ScienceClaw](https://github.com/AgentTeam-TaichuAI/ScienceClaw) - 科研助手架构参考
- [LangGraph](https://github.com/langchain-ai/langgraph) - 智能体框架
- [Playwright](https://playwright.dev/) - 浏览器自动化

## License

MIT
