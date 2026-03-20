"""
Planner Agent
规划代理 - 负责任务分解和策略制定
"""

from typing import Dict, Any, List
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from ..graph.state import AgentState


SYSTEM_PROMPT = """你是 DouyinClaw 的规划代理，负责分析用户任务并制定执行计划。

## 你的职责
1. 理解用户的任务意图
2. 将复杂任务分解为可执行的步骤
3. 确定每一步需要使用的工具或 Agent

## 支持的任务类型
- spark: 续火花任务
- reply: 智能回复任务
- analyze: 分析任务

## 可用的工具
- get_friends: 获取好友列表
- check_spark: 检测火花状态
- send_message: 发送消息
- screenshot: 截图
- browser_control: 浏览器控制

## 输出格式
返回一个 JSON 对象，包含：
{
    "task_type": "任务类型",
    "plan": ["步骤1", "步骤2", ...],
    "estimated_steps": 数字
}
"""


async def planner_node(state: AgentState) -> Dict[str, Any]:
    """规划节点"""
    task = state.get("current_task", "")

    # 使用 LLM 分析任务
    llm = ChatOpenAI(model="gpt-4", temperature=0)

    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=f"请分析以下任务并制定执行计划：\n\n{task}")
    ]

    response = await llm.ainvoke(messages)
    content = response.content

    # 解析 LLM 返回的计划
    import json
    try:
        # 尝试提取 JSON
        if "```json" in content:
            json_str = content.split("```json")[1].split("```")[0]
        elif "{" in content:
            start = content.index("{")
            end = content.rindex("}") + 1
            json_str = content[start:end]
        else:
            json_str = "{}"

        plan_data = json.loads(json_str)
    except:
        # 默认计划
        plan_data = {
            "task_type": "spark",
            "plan": ["获取好友列表", "检测火花状态", "发送消息"],
            "estimated_steps": 3
        }

    # 更新状态
    return {
        "task_type": plan_data.get("task_type", "spark"),
        "plan": plan_data.get("plan", []),
        "current_step": 0,
        "messages": [{
            "role": "planner",
            "content": f"已制定 {len(plan_data.get('plan', []))} 步执行计划",
            "metadata": plan_data
        }]
    }


class PlannerAgent:
    """规划代理类"""

    def __init__(self, model: str = "gpt-4"):
        self.llm = ChatOpenAI(model=model, temperature=0)

    async def analyze_task(self, task: str) -> Dict[str, Any]:
        """分析任务"""
        messages = [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=f"请分析以下任务：\n\n{task}")
        ]
        response = await self.llm.ainvoke(messages)
        return {"analysis": response.content}

    async def create_plan(self, task: str) -> List[str]:
        """创建执行计划"""
        state = await planner_node({"current_task": task})
        return state.get("plan", [])
