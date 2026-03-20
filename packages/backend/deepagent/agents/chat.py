"""
Chat Agent
对话代理 - 负责消息生成和对话回复
"""

from typing import Dict, Any, List
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from ..graph.state import AgentState


CHAT_PROMPT = """你是 DouyinClaw 的对话代理，负责生成有趣、个性化的消息。

## 你的职责
1. 根据上下文生成合适的回复
2. 续火花消息要有趣、个性化
3. 避免重复使用相同的消息

## 消息风格
- 友好、热情
- 带有适当的 emoji
- 简短但有意义

## 续火花消息示例
- "早呀！来续火花啦~ 今天天气真好！☀️"
- "嘿！我是主人的 AI 小助手，来帮你续火花！有什么开心的事分享吗？🌟"
- "叮咚~ 火花续命成功！祝你今天元气满满！💪"
- "续火花时间到！最近在忙什么呢？😄"

## 输出格式
返回 JSON：
{
    "message": "生成的消息内容",
    "style": "friendly | casual | formal",
    "emojis_used": ["emoji1", "emoji2"]
}
"""


async def chat_node(state: AgentState) -> Dict[str, Any]:
    """对话生成节点"""
    import os
    import json

    task_type = state.get("task_type", "")
    observations = state.get("observations", [])

    # 选择模型
    model = os.getenv("CHAT_MODEL", "gpt-4")
    api_key = os.getenv("OPENAI_API_KEY", "")

    if not api_key:
        # 使用 GLM 作为备选
        api_key = os.getenv("GLM_API_KEY", "")
        base_url = "https://open.bigmodel.cn/api/paas/v4"
        model = "glm-4"
    else:
        base_url = None

    llm = ChatOpenAI(
        model=model,
        temperature=0.8,  # 更高的温度产生更多变化
        api_key=api_key,
        base_url=base_url if base_url else None
    )

    # 根据任务类型生成不同的消息
    if task_type == "spark":
        prompt = f"""{CHAT_PROMPT}

## 任务
请生成一条有趣的续火花消息。

## 上下文
{chr(10).join(observations[-3:]) if observations else "无"}

请生成消息。
"""
    elif task_type == "reply":
        prompt = f"""请根据以下对话上下文生成一条回复：

{chr(10).join(observations[-5:]) if observations else "无"}

要求：
1. 回复要自然、友好
2. 如果是问题，要给出有意义的回答
3. 适当使用 emoji
"""
    else:
        prompt = f"请根据以下内容生成一条消息：\n\n{chr(10).join(observations)}"

    messages = [
        SystemMessage(content=CHAT_PROMPT),
        HumanMessage(content=prompt)
    ]

    try:
        response = await llm.ainvoke(messages)
        content = response.content

        # 尝试解析 JSON
        try:
            if "{" in content:
                start = content.index("{")
                end = content.rindex("}") + 1
                json_str = content[start:end]
                chat_data = json.loads(json_str)
                message = chat_data.get("message", content)
            else:
                message = content
        except:
            message = content

        return {
            "generated_response": message,
            "messages": [{
                "role": "chat",
                "content": message,
                "metadata": {"model": model}
            }]
        }

    except Exception as e:
        # 使用默认消息
        default_messages = [
            "来续火花啦~ 祝你今天开心！🌟",
            "叮咚~ 火花续命成功！💪",
            "早呀！来续个火花~ ☀️",
        ]
        import random
        message = random.choice(default_messages)

        return {
            "generated_response": message,
            "messages": [{
                "role": "chat",
                "content": message,
                "metadata": {"error": str(e), "fallback": True}
            }]
        }


class ChatAgent:
    """对话代理类"""

    def __init__(self, model: str = "gpt-4"):
        self.llm = ChatOpenAI(model=model, temperature=0.8)

    async def generate_spark_message(self, context: str = "") -> str:
        """生成续火花消息"""
        state = await chat_node({
            "task_type": "spark",
            "observations": [context] if context else []
        })
        return state.get("generated_response", "来续火花啦~")

    async def generate_reply(self, messages: List[str]) -> str:
        """生成回复"""
        state = await chat_node({
            "task_type": "reply",
            "observations": messages
        })
        return state.get("generated_response", "")
