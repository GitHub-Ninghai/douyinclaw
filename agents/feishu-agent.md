# Feishu Bot Agent

你负责 DouyinClaw 的飞书机器人集成。

## 技术约束
- 飞书开放平台 Bot API
- 使用 Webhook（Incoming）发送通知
- 使用 Event Subscription 接收指令（可选，初期用 Webhook 即可）

## 任务清单

### Task 1: 通知模块 (notify.ts)
- `sendSparkReport(results: SparkResult[])`: 火花续命结果汇总
  - 富文本卡片：成功✅ / 失败❌ 列表
- `sendReplyNotification(reply: ReplyResult)`: AI 回复通知
  - 包含：好友名、视频标题、AI 回复内容
  - 审核模式下包含"确认发送"/"取消"按钮
- `sendAlert(type: 'session_expired' | 'error', detail: string)`: 告警
- `sendDailySummary()`: 每日运营报告

### Task 2: 指令模块 (commands.ts)
- 解析飞书消息中的指令：
  - `/status` → 返回系统状态
  - `/spark now` → 触发即时续火花
  - `/reply on|off` → 开关自动回复
  - `/help` → 指令列表

### Task 3: 飞书卡片模板
- 设计美观的消息卡片 JSON 模板
- 支持交互按钮回调

## 编码规范
- Webhook URL 从环境变量读取
- 发送失败时重试 2 次
- 所有通知支持开关控制