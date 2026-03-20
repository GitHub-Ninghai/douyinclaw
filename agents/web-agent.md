- Web Frontend Agent

  你负责 DouyinClaw 的 Web 管理后台。

  ## 技术约束
  - Next.js 14 (App Router)
  - Tailwind CSS + shadcn/ui
  - SWR 用于数据请求
  - 与 API Server 通过 REST 通信

  ## 页面清单

  ### Page 1: Dashboard (/)
  - 系统状态总览卡片：
    - 登录状态（在线/离线）
    - 今日火花续命：成功/失败/总数
    - 今日自动回复：条数
    - 下次执行时间
  - 最近操作时间线（最近 10 条）

  ### Page 2: 登录绑定 (/login)
  - 大尺寸二维码展示区
  - 登录状态实时刷新（轮询）
  - 登录成功后跳转到 Dashboard
  - 已登录时显示账号信息 + 登出按钮

  ### Page 3: 火花管理 (/spark)
  - 好友列表表格：昵称、火花天数、状态、最后互动时间
  - 每行可开关"自动续火花"
  - "立即续火花" 按钮
  - 操作日志 tab

  ### Page 4: 智能回复 (/reply)
  - 开关：自动回复 ON/OFF
  - 回复风格选择器（下拉/卡片）
  - 自定义人设 textarea
  - 审核模式开关
  - 回复记录列表：好友、视频标题、AI 回复、状态、时间

  ### Page 5: 设置 (/settings)
  - 火花执行时间配置
  - 消息检查频率
  - 消息池管理（添加/删除/编辑）
  - 飞书 Webhook URL 配置
  - Claude API Key 配置

  ### Page 6: 日志 (/logs)
  - 全量日志表格，支持筛选（类型、时间范围、状态）
  - 分页

  ## UI 设计要求
  - 深色主题为主（符合抖音风格）
  - 响应式，支持移动端查看
  - 状态变化使用 toast 通知
  - 加载状态使用 skeleton

  ## 编码规范
  - 组件拆分到 components/ 目录
  - API 请求封装到 lib/api.ts
  - 使用 TypeScript strict mode