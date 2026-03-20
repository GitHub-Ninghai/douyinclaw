# DouyinClaw 架构设计文档

> 参考 ScienceClaw 架构，重新设计 DouyinClaw 为真正的 AI 智能体系统

## 1. 项目定位

**DouyinClaw** 是一个基于 AI 智能体的抖音社交助手，采用完全容器化的微服务架构，提供安全、透明、可扩展的自动化社交能力。

### 核心特性

| 特性 | 描述 |
|------|------|
| 🔒 **安全隔离** | 完全运行在 Docker 容器中，智能体无法访问宿主系统 |
| 👁️ **完全透明** | 每一步操作可追踪、可审计 |
| 🚀 **即开即用** | 一键启动完整环境，无需繁琐配置 |
| 🤖 **多智能体** | 基于 LangGraph 的多智能体协作系统 |
| 🔧 **工具系统** | 四层工具架构，支持自定义扩展 |
| 📝 **技能系统** | SKILL.md 定义复杂工作流 |

## 2. 微服务架构

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

### 服务清单

| 服务 | 技术栈 | 端口 | 职责 |
|------|--------|------|------|
| **Frontend** | Next.js 14 + Tailwind | 3000 | Web 管理界面 |
| **Backend** | FastAPI + LangGraph | 3001 | API 服务 + 智能体引擎 |
| **Sandbox** | Playwright + Docker | 9222 | 浏览器自动化沙箱 |
| **Task Service** | Node.js + node-cron | 3002 | 定时任务调度 |
| **WebSearch** | SearXNG | 8888 | 搜索微服务 |
| **MongoDB** | MongoDB | 27017 | 数据存储 |
| **Redis** | Redis | 6379 | 缓存 + 任务队列 |

## 3. 智能体引擎 (DeepAgent)

基于 **LangGraph** 构建的多智能体系统：

```
┌─────────────────────────────────────────────────────────────┐
│                    DeepAgent Engine                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────┐                                           │
│   │ User Input  │                                           │
│   └──────┬──────┘                                           │
│          │                                                   │
│          ▼                                                   │
│   ┌─────────────┐     ┌─────────────┐                       │
│   │PlannerAgent │────►│  Router     │                       │
│   │  (规划)     │     │  (路由)     │                       │
│   └─────────────┘     └──────┬──────┘                       │
│                              │                               │
│          ┌───────────────────┼───────────────────┐          │
│          ▼                   ▼                   ▼          │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│   │ VisionAgent │     │  ChatAgent  │     │  ToolAgent  │   │
│   │  (视觉)     │     │  (对话)     │     │  (工具)     │   │
│   └──────┬──────┘     └──────┬──────┘     └──────┬──────┘   │
│          │                   │                   │          │
│          └───────────────────┼───────────────────┘          │
│                              ▼                               │
│                       ┌─────────────┐                       │
│                       │  Executor   │                       │
│                       │  (执行器)   │                       │
│                       └──────┬──────┘                       │
│                              │                               │
│                              ▼                               │
│                       ┌─────────────┐                       │
│                       │   Output    │                       │
│                       └─────────────┘                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Agent 类型

| Agent | 职责 | 模型 |
|-------|------|------|
| **PlannerAgent** | 任务分解、策略规划 | GPT-4 / Claude |
| **VisionAgent** | 截图分析、页面理解 | GLM-4V / Claude Vision |
| **ChatAgent** | 消息生成、对话回复 | GPT-4 / GLM-4 |
| **ToolAgent** | 工具调用、操作执行 | GPT-4 |

### 状态机设计

```python
from langgraph.graph import StateGraph, END

class AgentState(TypedDict):
    messages: List[Message]
    current_task: str
    plan: List[str]
    current_step: int
    tools_to_call: List[ToolCall]
    observations: List[str]
    final_result: Optional[str]

def build_agent_graph():
    graph = StateGraph(AgentState)

    # 添加节点
    graph.add_node("planner", planner_node)
    graph.add_node("vision", vision_node)
    graph.add_node("chat", chat_node)
    graph.add_node("tool", tool_node)
    graph.add_node("executor", executor_node)

    # 定义边
    graph.add_edge("planner", "router")
    graph.add_conditional_edges("router", route_by_task)
    graph.add_edge("vision", "executor")
    graph.add_edge("chat", "executor")
    graph.add_edge("tool", "executor")
    graph.add_conditional_edges("executor", should_continue)

    return graph.compile()
```

## 4. 工具系统 (Tools)

四层工具架构：

```
┌─────────────────────────────────────────────────────────────┐
│                    Tools System                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Layer 1: Built-in Tools (内置工具)                         │
│  ├── web_search     - 网页搜索                              │
│  ├── screenshot     - 页面截图                              │
│  └── browser_control - 浏览器控制                           │
│                                                             │
│  Layer 2: Douyin Tools (抖音工具集)                         │
│  ├── get_friends    - 获取好友列表                          │
│  ├── check_spark    - 检测火花状态                          │
│  ├── send_message   - 发送消息                              │
│  ├── get_messages   - 获取消息列表                          │
│  └── like_video     - 点赞视频                              │
│                                                             │
│  Layer 3: Sandbox Tools (沙箱工具)                          │
│  ├── read_file      - 读取文件                              │
│  ├── write_file     - 写入文件                              │
│  ├── execute_code   - 执行代码                              │
│  └── shell_command  - Shell 命令                            │
│                                                             │
│  Layer 4: Custom Tools (自定义工具)                         │
│  └── @tool 装饰器 - 用户自定义，热加载                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 工具接口定义

```typescript
interface Tool {
  name: string;
  description: string;
  parameters: JSONSchema;
  execute: (params: any, context: ToolContext) => Promise<ToolResult>;
}

interface ToolContext {
  browser: BrowserSession;
  workspace: string;
  userId: string;
  sessionId: string;
}

interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}
```

### 工具注册机制

```python
# Tools/custom_tool.py

from douyin_claw import tool

@tool
def analyze_emoji_usage(friend_id: str) -> dict:
    """分析好友的 emoji 使用习惯"""
    # 工具实现
    return {"favorite_emoji": "😂", "frequency": 0.3}
```

## 5. 技能系统 (Skills)

基于 **SKILL.md** 的工作流定义：

```
Skills/
├── spark-keeper/
│   └── SKILL.md        # 续火花技能
├── smart-reply/
│   └── SKILL.md        # 智能回复技能
├── video-analyzer/
│   └── SKILL.md        # 视频分析技能
├── tool-creator/
│   └── SKILL.md        # 工具创建技能
└── skill-creator/
    └── SKILL.md        # 技能创建技能
```

### SKILL.md 格式规范

```markdown
# 技能名称

## 描述
简要描述这个技能的用途

## 触发条件
- 关键词: ["续火花", "发消息"]
- 意图: social_interaction

## 工作流程

### Step 1: 获取好友列表
使用 `get_friends` 工具获取需要处理的好友列表

### Step 2: 检测火花状态
使用 `check_spark` 工具检测每个好友的火花状态

### Step 3: 生成消息
使用 ChatAgent 生成个性化的续火花消息

### Step 4: 发送消息
使用 `send_message` 工具发送消息

### Step 5: 记录结果
记录发送结果，更新数据库

## 注意事项
- 避免重复发送
- 消息要个性化
- 控制发送频率

## 示例对话
User: 帮我续火花
Agent: 好的，我来帮你续火花。正在获取好友列表...
```

## 6. 沙箱服务 (Sandbox)

### Docker 架构

```yaml
# docker-compose.yml
services:
  sandbox:
    build: ./packages/sandbox
    container_name: douyin-claw-sandbox
    ports:
      - "9222:9222"  # Chrome DevTools
    volumes:
      - ./workspace:/workspace
      - ./data/sessions:/sessions
    environment:
      - CHROME_FLAGS=--disable-blink-features=AutomationControlled
    security_opt:
      - no-new-privileges:true
    read_only: false
    tmpfs:
      - /tmp
```

### 浏览器自动化

```typescript
// packages/sandbox/src/browser.ts
export class BrowserSandbox {
  private browser: Browser;
  private context: BrowserContext;

  async initialize() {
    this.browser = await chromium.launch({
      headless: false,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--no-sandbox'
      ]
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 ...'
    });
  }

  async executeAction(action: BrowserAction): Promise<ActionResult> {
    const page = await this.context.newPage();

    switch (action.type) {
      case 'navigate':
        await page.goto(action.url);
        break;
      case 'click':
        await page.mouse.click(action.x, action.y);
        break;
      case 'input':
        await page.keyboard.type(action.text);
        break;
      case 'screenshot':
        return { image: await page.screenshot() };
    }
  }
}
```

## 7. 数据流设计

### 续火花流程

```
用户请求
    │
    ▼
┌─────────────┐
│  Frontend   │
└──────┬──────┘
       │ HTTP POST /api/spark/start
       ▼
┌─────────────┐
│   Backend   │
│  (API 层)   │
└──────┬──────┘
       │ 创建任务
       ▼
┌─────────────┐
│ DeepAgent   │
│   Engine    │
└──────┬──────┘
       │
       ├─► PlannerAgent: 分析任务，制定计划
       │
       ├─► VisionAgent: 截图分析页面
       │        │
       │        ▼
       │   ┌─────────────┐
       │   │   Sandbox   │
       │   │ (浏览器)    │
       │   └─────────────┘
       │
       ├─► ChatAgent: 生成消息
       │
       └─► ToolAgent: 执行工具调用
                │
                ▼
          ┌─────────────┐
          │  MongoDB    │
          │ (记录结果)  │
          └─────────────┘
```

## 8. 项目结构

```
DouyinClaw/
├── docker-compose.yml              # 服务编排
├── docker-compose-release.yml      # 预构建镜像
├── .env.example                    # 环境变量模板
│
├── Tools/                          # 自定义工具 (热加载)
│   └── custom_tool.py
│
├── Skills/                         # 技能包
│   ├── spark-keeper/
│   ├── smart-reply/
│   └── video-analyzer/
│
├── workspace/                      # 工作空间 (数据隔离)
│
├── packages/
│   ├── shared/                     # 共享类型定义
│   │
│   ├── backend/                    # 后端服务 (FastAPI)
│   │   ├── deepagent/              # 智能体引擎
│   │   │   ├── agents/             # Agent 定义
│   │   │   ├── graph/              # LangGraph 定义
│   │   │   └── memory/             # 记忆管理
│   │   ├── tools/                  # 工具实现
│   │   ├── skills/                 # 内置技能
│   │   ├── routes/                 # API 路由
│   │   └── models/                 # 数据模型
│   │
│   ├── frontend/                   # 前端 (Next.js)
│   │   ├── app/                    # App Router
│   │   ├── components/             # 组件
│   │   └── lib/                    # 工具库
│   │
│   ├── sandbox/                    # 沙箱服务
│   │   ├── browser/                # 浏览器自动化
│   │   ├── executor/               # 代码执行器
│   │   └── communication/          # 通信层
│   │
│   ├── task-service/               # 任务调度服务
│   │   ├── scheduler/              # 调度器
│   │   └── jobs/                   # 任务定义
│   │
│   └── feishu/                     # 飞书集成
│       ├── webhook/                # Webhook 处理
│       └── messages/               # 消息模板
│
├── docs/                           # 文档
│   ├── ARCHITECTURE.md             # 架构文档
│   ├── agent-engine-design.md      # 智能体引擎设计
│   ├── tools-system-design.md      # 工具系统设计
│   ├── skills-system-design.md     # 技能系统设计
│   └── sandbox-service-design.md   # 沙箱服务设计
│
└── scripts/                        # 脚本
    ├── start-dev.sh                # 开发环境启动
    └── start-prod.sh               # 生产环境启动
```

## 9. 技术栈选型

| 层级 | 技术 | 原因 |
|------|------|------|
| **智能体框架** | LangGraph | 状态机 + 多智能体支持 |
| **后端框架** | FastAPI | 异步 + 自动文档 |
| **前端框架** | Next.js 14 | React + App Router |
| **数据库** | MongoDB | 文档型 + 灵活 Schema |
| **缓存** | Redis | 高性能 + 任务队列 |
| **浏览器** | Playwright | 跨浏览器 + 自动化 |
| **搜索** | SearXNG | 隐私 + 元搜索 |
| **容器** | Docker | 隔离 + 可移植 |

## 10. 部署方案

### 开发环境

```bash
# 克隆项目
git clone https://github.com/xxx/DouyinClaw.git
cd DouyinClaw

# 配置环境变量
cp .env.example .env

# 启动开发环境 (构建镜像)
docker compose up -d --build

# 查看日志
docker compose logs -f backend
```

### 生产环境

```bash
# 使用预构建镜像
docker compose -f docker-compose-release.yml up -d

# 检查服务状态
docker compose ps
```

## 11. 安全设计

1. **容器隔离**: 所有服务运行在 Docker 容器中
2. **文件系统隔离**: 数据只保存在 `./workspace` 目录
3. **网络隔离**: 内部服务不暴露到公网
4. **API 认证**: JWT Token 认证
5. **敏感信息**: 环境变量注入，不存储在代码中
6. **操作审计**: 所有操作记录日志

## 12. 与 ScienceClaw 的对比

| 维度 | ScienceClaw | DouyinClaw |
|------|-------------|------------|
| **定位** | 科研助手 | 社交助手 |
| **智能体** | DeepAgents | DeepAgents (复用) |
| **沙箱** | AIO Sandbox | 自建 Sandbox |
| **工具** | ToolUniverse (1900+) | 抖音工具集 |
| **技能** | 科研相关 | 社交相关 |
| **前端** | Vue 3 | Next.js 14 |
| **后端** | FastAPI | FastAPI |

## 13. 开发路线图

### Phase 1: 基础架构 (2 周)
- [ ] Docker Compose 配置
- [ ] 基础 Backend 框架
- [ ] 基础 Frontend 框架
- [ ] MongoDB Schema 设计

### Phase 2: 智能体引擎 (3 周)
- [ ] LangGraph 集成
- [ ] 4 种 Agent 实现
- [ ] 状态管理
- [ ] 通信机制

### Phase 3: 工具系统 (2 周)
- [ ] 工具接口定义
- [ ] 内置工具实现
- [ ] 抖音工具集
- [ ] 热加载机制

### Phase 4: 技能系统 (2 周)
- [ ] SKILL.md 解析器
- [ ] 内置技能实现
- [ ] 技能匹配机制

### Phase 5: 沙箱服务 (2 周)
- [ ] 浏览器容器化
- [ ] 代码执行沙箱
- [ ] 通信协议

### Phase 6: 集成测试 (1 周)
- [ ] 端到端测试
- [ ] 性能优化
- [ ] 文档完善
