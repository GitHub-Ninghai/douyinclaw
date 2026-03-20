# 工具创建器 (Tool Creator)

## 描述
通过自然语言创建自定义工具，自动生成、测试和保存工具代码。

## 触发条件
- 关键词: ["创建工具", "新工具", "添加工具"]
- 意图: tool_creation

## 工作流程

### Step 1: 理解需求
```
输入: 用户描述需要什么工具
分析:
  - 工具名称
  - 功能描述
  - 参数列表
  - 返回值
```

### Step 2: 生成代码
```
动作: 使用 AI 生成 Python 代码
模板:
```python
from tools.base import BaseTool, ToolContext, ToolResult

class {ToolName}Tool(BaseTool):
    name = "{tool_name}"
    description = "{description}"
    parameters = {...}

    async def execute(self, params, context):
        # 实现逻辑
        return ToolResult(success=True, data={...})
```
```

### Step 3: 测试工具
```
动作: 在沙箱中测试工具
输入: 测试参数
验证: 返回结果是否符合预期
```

### Step 4: 保存工具
```
动作: 保存到 Tools/ 目录
文件: Tools/{tool_name}.py
注册: 自动注册到工具管理器
```

## 示例对话

```
User: 创建一个工具，可以分析好友的 emoji 使用习惯

Agent: 好的，我来创建这个工具。

[生成代码中...]

```python
from tools.base import BaseTool, ToolContext, ToolResult
from collections import Counter

class AnalyzeEmojiTool(BaseTool):
    name = "analyze_emoji"
    description = "分析好友的 emoji 使用习惯"
    parameters = {
        "type": "object",
        "properties": {
            "friend_id": {
                "type": "string",
                "description": "好友ID"
            },
            "message_count": {
                "type": "integer",
                "description": "分析的消息数量",
                "default": 100
            }
        },
        "required": ["friend_id"]
    }

    async def execute(self, params, context):
        friend_id = params.get("friend_id")
        count = params.get("message_count", 100)

        # 获取消息
        messages = await get_friend_messages(friend_id, count)

        # 分析 emoji
        emojis = []
        for msg in messages:
            emojis.extend(extract_emojis(msg["content"]))

        counter = Counter(emojis)

        return ToolResult(
            success=True,
            data={
                "friend_id": friend_id,
                "total_emojis": len(emojis),
                "unique_emojis": len(counter),
                "top_emojis": counter.most_common(5),
                "emoji_frequency": len(emojis) / len(messages) if messages else 0
            }
        )
```

[测试中...]
✅ 测试通过

[保存工具...]
✅ 已保存到 Tools/analyze_emoji.py

工具已创建完成！你现在可以使用 `analyze_emoji` 工具了。
```

## 注意事项

1. **代码安全**
   - 检查生成的代码是否安全
   - 禁止执行危险操作
   - 限制文件系统访问

2. **测试验证**
   - 必须通过测试才能保存
   - 提供测试用例

3. **版本管理**
   - 保留旧版本
   - 支持回滚
