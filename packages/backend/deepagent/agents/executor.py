"""
Executor Node
执行器节点 - 负责协调各 Agent 的执行结果
"""

from typing import Dict, Any
import datetime

from ..graph.state import AgentState


async def executor_node(state: AgentState) -> Dict[str, Any]:
    """执行器节点 - 汇总执行结果并决定下一步"""

    # 更新时间戳
    now = datetime.datetime.now().isoformat()

    # 检查是否有最终结果
    current_step = state.get("current_step", 0)
    plan = state.get("plan", [])
    tool_results = state.get("tool_results", [])
    observations = state.get("observations", [])

    # 判断是否完成
    final_result = None

    if current_step >= len(plan) and plan:
        # 所有步骤完成
        final_result = {
            "status": "completed",
            "steps_completed": current_step,
            "observations": observations[-5:],  # 保留最近5条观察
            "tool_calls": len(tool_results),
        }

    # 检查是否有错误
    errors = [r for r in tool_results if not r.get("success", True)]
    if errors:
        final_result = {
            "status": "error",
            "errors": errors,
            "steps_completed": current_step,
        }

    # 更新状态
    updates = {
        "updated_at": now,
        "current_step": current_step,
    }

    if final_result:
        updates["final_result"] = final_result

    return updates


__all__ = ['executor_node']
