"""
Agent State Definition
定义智能体状态机的状态结构
"""

from typing import TypedDict, List, Optional, Annotated
from operator import add


class Message(TypedDict):
    """消息结构"""
    role: str  # user, assistant, system
    content: str
    metadata: Optional[dict]


class ToolCall(TypedDict):
    """工具调用"""
    tool_name: str
    parameters: dict
    result: Optional[any]


class BrowserAction(TypedDict):
    """浏览器操作"""
    type: str  # navigate, click, input, scroll, screenshot
    url: Optional[str]
    x: Optional[int]
    y: Optional[int]
    text: Optional[str]


class AgentState(TypedDict):
    """智能体状态"""
    # 消息历史
    messages: Annotated[List[Message], add]

    # 当前任务
    current_task: str
    task_type: str  # spark, reply, analyze, etc.

    # 执行计划
    plan: List[str]
    current_step: int

    # 工具调用
    tools_to_call: List[ToolCall]
    tool_results: Annotated[List[ToolCall], add]

    # 浏览器操作
    browser_actions: Annotated[List[BrowserAction], add]

    # 视觉理解
    screenshot_base64: Optional[str]
    page_understanding: Optional[str]

    # 生成的回复
    generated_response: Optional[str]

    # 执行结果
    observations: Annotated[List[str], add]
    final_result: Optional[str]

    # 元数据
    user_id: str
    session_id: str
    created_at: str
    updated_at: str


def create_initial_state(user_id: str, task: str, task_type: str) -> AgentState:
    """创建初始状态"""
    import datetime
    now = datetime.datetime.now().isoformat()

    return AgentState(
        messages=[],
        current_task=task,
        task_type=task_type,
        plan=[],
        current_step=0,
        tools_to_call=[],
        tool_results=[],
        browser_actions=[],
        screenshot_base64=None,
        page_understanding=None,
        generated_response=None,
        observations=[],
        final_result=None,
        user_id=user_id,
        session_id=f"session_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}",
        created_at=now,
        updated_at=now,
    )
