"""
Agent Graph Builder
构建 LangGraph 智能体图
"""

from typing import Literal
from langgraph.graph import StateGraph, END

from .state import AgentState, create_initial_state
from ..agents.planner import planner_node
from ..agents.vision import vision_node
from ..agents.chat import chat_node
from ..agents.tool import tool_node
from ..agents.executor import executor_node


def route_by_task(state: AgentState) -> Literal["vision", "chat", "tool"]:
    """根据任务类型路由到不同的 Agent"""
    task_type = state.get("task_type", "")

    if task_type in ["spark", "analyze_page", "click_element"]:
        return "vision"
    elif task_type in ["reply", "generate_message"]:
        return "chat"
    else:
        return "tool"


def should_continue(state: AgentState) -> Literal["continue", "end"]:
    """判断是否继续执行"""
    if state.get("final_result"):
        return "end"

    current_step = state.get("current_step", 0)
    plan = state.get("plan", [])

    if current_step >= len(plan):
        return "end"

    return "continue"


def create_agent_graph():
    """创建智能体图"""
    # 创建状态图
    graph = StateGraph(AgentState)

    # 添加节点
    graph.add_node("planner", planner_node)
    graph.add_node("router", lambda state: state)  # 路由节点
    graph.add_node("vision", vision_node)
    graph.add_node("chat", chat_node)
    graph.add_node("tool", tool_node)
    graph.add_node("executor", executor_node)

    # 设置入口点
    graph.set_entry_point("planner")

    # 添加边
    graph.add_edge("planner", "router")

    # 条件路由
    graph.add_conditional_edges(
        "router",
        route_by_task,
        {
            "vision": "vision",
            "chat": "chat",
            "tool": "tool",
        }
    )

    # 各 Agent 到执行器
    graph.add_edge("vision", "executor")
    graph.add_edge("chat", "executor")
    graph.add_edge("tool", "executor")

    # 执行器条件结束
    graph.add_conditional_edges(
        "executor",
        should_continue,
        {
            "continue": "planner",
            "end": END,
        }
    )

    return graph.compile()


# 导出
__all__ = ['create_agent_graph', 'create_initial_state', 'AgentState']
