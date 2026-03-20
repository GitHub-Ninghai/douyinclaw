# DouyinClaw 项目上下文

## 项目概述
DouyinClaw 是一个基于 AI 智能体的抖音社交助手，参考 ScienceClaw 架构重新设计，采用微服务架构，提供自动续火花和 AI 智能回复功能。

## 核心特性
- **多智能体系统**: 基于 LangGraph 的多智能体协作 (PlannerAgent, VisionAgent, ChatAgent, ToolAgent)
- **四层工具架构**: 内置工具 + 抖音工具集 + 沙箱工具 + 自定义工具
- **技能系统**: SKILL.md 定义复杂工作流
- **安全隔离**: Docker 容器化部署

## 技术栈
- **前端**: Next.js 14 + React + TailwindCSS + SWR
- **后端**: FastAPI + LangGraph (Python)
- **数据库**: MongoDB 7.0
- **缓存**: Redis 7
- **任务调度**: APScheduler
- **浏览器自动化**: Playwright (沙箱服务)
- **AI**: GLM-4V (视觉) + GLM-4/GPT-4 (对话)

## 微服务架构
```
┌─────────────────────────────────────────────────────────────┐
│                    DouyinClaw Services                       │
├─────────────────────────────────────────────────────────────┤
│  frontend (:3000)    backend (:3001)    sandbox (:9222)     │
│  task-service (:3002)                                        │
├─────────────────────────────────────────────────────────────┤
│  mongodb (:27017)    redis (:6379)    websearch (:8888)     │
└─────────────────────────────────────────────────────────────┘
```

## 项目结构
```
DouyinClaw/
├── docker-compose.new.yml     # 7 服务 Docker 编排
├── docker-compose.test.yml    # 基础设施测试配置
├── .env.example               # 环境变量模板
│
├── Tools/                     # 自定义工具 (热加载)
├── Skills/                    # 技能包
│   ├── spark-keeper/SKILL.md  # 续火花技能
│   ├── smart-reply/SKILL.md   # 智能回复技能
│   ├── video-analyzer/SKILL.md # 视频分析技能
│   └── tool-creator/SKILL.md  # 工具创建技能
│
├── workspace/                 # 沙箱工作空间
│
├── docs/
│   └── ARCHITECTURE.md        # 完整架构文档
│
└── packages/
    ├── backend/               # FastAPI 后端服务
    │   ├── deepagent/         # 智能体引擎
    │   │   ├── agents/        # Agent 实现
    │   │   │   ├── planner.py # 规划代理
    │   │   │   ├── vision.py  # 视觉代理
    │   │   │   ├── chat.py    # 对话代理
    │   │   │   ├── tool.py    # 工具代理
    │   │   │   └── executor.py # 执行器
    │   │   └── graph/         # LangGraph 状态机
    │   ├── tools/             # 工具系统
    │   │   ├── douyin.py      # 抖音工具集
    │   │   ├── browser.py     # 浏览器工具
    │   │   └── sandbox.py     # 沙箱工具
    │   ├── main.py            # API 入口
    │   ├── Dockerfile
    │   └── requirements.txt
    │
    ├── web/                    # Next.js 前端
    │   ├── src/app/
    │   │   ├── agents/        # 智能体任务页面
    │   │   ├── tools/         # 工具管理页面
    │   │   ├── spark/         # 续火花页面
    │   │   └── reply/         # 智能回复页面
    │   ├── Dockerfile
    │   └── package.json
    │
    ├── sandbox/                # Playwright 沙箱服务
    │   ├── browser/            # 浏览器自动化
    │   ├── executor/           # 代码执行器
    │   ├── communication/      # WebSocket 通信
    │   ├── main.py
    │   ├── Dockerfile
    │   └── requirements.txt
    │
    └── task-service/           # 定时任务服务
        ├── main.py             # APScheduler 调度器
        ├── Dockerfile
        └── requirements.txt
```

## 智能体系统

### Agent 类型
| Agent | 职责 | 模型 |
|-------|------|------|
| PlannerAgent | 任务分解、策略规划 | GPT-4 / GLM-4 |
| VisionAgent | 截图分析、页面理解 | GLM-4V |
| ChatAgent | 消息生成、对话回复 | GLM-4 |
| ToolAgent | 工具调用、操作执行 | GPT-4 |

### 状态机流程
```
User Input → PlannerAgent → Router → VisionAgent/ChatAgent/ToolAgent → Executor → Output
```

## 工具系统 (四层架构)

### Layer 1: 内置工具
- `web_search` - 网页搜索
- `screenshot` - 页面截图
- `browser_control` - 浏览器控制

### Layer 2: 抖音工具集
- `get_friends` - 获取好友列表
- `check_spark` - 检测火花状态
- `send_message` - 发送消息
- `get_messages` - 获取消息列表
- `like_video` - 点赞视频

### Layer 3: 沙箱工具
- `read_file` - 读取文件
- `write_file` - 写入文件
- `execute_code` - 执行代码
- `shell_command` - Shell 命令

### Layer 4: 自定义工具
- `@tool` 装饰器 - 热加载用户自定义工具

## 快速启动

### 环境准备
```bash
# 1. 配置环境变量
cp .env.example .env
# 编辑 .env 填写 GLM_API_KEY

# 2. 配置 Docker 镜像加速器 (可选)
# 编辑 C:\Users\<用户名>\.docker\daemon.json
```

### 启动服务
```bash
# 启动所有服务
docker compose -f docker-compose.new.yml up -d --build

# 查看服务状态
docker compose -f docker-compose.new.yml ps

# 查看日志
docker compose -f docker-compose.new.yml logs -f backend
```

### 访问地址
| 服务 | 地址 |
|------|------|
| 前端 | http://localhost:3000 |
| API | http://localhost:3001 |
| 沙箱 | http://localhost:9222 |
| MongoDB | localhost:27017 |
| Redis | localhost:6379 |
| 搜索 | http://localhost:8888 |

## 环境变量
```bash
# AI API Keys (必填)
GLM_API_KEY=your_glm_api_key

# 可选
OPENAI_API_KEY=your_openai_key
FEISHU_WEBHOOK_URL=your_feishu_webhook
```

## 当前状态 (2026-03-20)

### 已完成
- [x] 项目重新设计 (参考 ScienceClaw 架构)
- [x] 微服务架构 (7 个服务)
- [x] 智能体引擎 (LangGraph)
- [x] 四层工具系统
- [x] 技能系统 (4 个 SKILL.md)
- [x] 沙箱服务 (Playwright)
- [x] 前端新页面 (/agents, /tools)
- [x] Docker 配置

### 进行中
- [ ] Docker 镜像拉取 (网络问题)
- [ ] 端到端测试

### 待办
- [ ] 配置 Docker 镜像加速器
- [ ] 完成首次部署
- [ ] 功能测试

## 常用命令

```bash
# Docker 操作
docker compose -f docker-compose.new.yml up -d      # 启动
docker compose -f docker-compose.new.yml down       # 停止
docker compose -f docker-compose.new.yml logs -f    # 日志
docker compose -f docker-compose.new.yml ps         # 状态

# 开发模式 (不使用 Docker)
cd packages/backend && python main.py              # 后端
cd packages/web && pnpm dev                        # 前端
cd packages/sandbox && python main.py              # 沙箱
```

## 注意事项
1. Windows 环境需要配置 Docker 镜像加速器
2. GLM_API_KEY 是必填的 (视觉代理使用 GLM-4V)
3. 沙箱服务需要较大的 shm_size (2GB)
4. MongoDB 默认用户: admin/admin123

## 恢复上下文指南

下次进入项目时，可以说：
- "继续 DouyinClaw 项目开发"
- "启动 Docker 服务"
- "查看项目状态"
- "运行智能体测试"
