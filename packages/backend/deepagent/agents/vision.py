"""
Vision Agent
视觉代理 - 负责截图分析和页面理解
"""

from typing import Dict, Any, Optional
import base64
import httpx

from ..graph.state import AgentState


VISION_PROMPT = """你是 DouyinClaw 的视觉代理，负责分析抖音页面截图。

## 你的职责
1. 识别页面上的元素（好友列表、火花图标、消息等）
2. 判断当前页面状态
3. 决定下一步操作

## 火花图标识别
- 灰色火花：需要续火花
- 彩色/橙色火花：今天已发过消息，跳过

## 输出格式
返回 JSON：
{
    "understanding": "页面内容描述",
    "elements_found": ["元素1", "元素2"],
    "spark_status": {
        "friend_name": "gray" | "color"
    },
    "action": {
        "type": "click" | "input" | "scroll" | "done",
        "position": {"x": 100, "y": 200},
        "content": "要输入的内容"
    },
    "friend_identified": "好友昵称"
}
"""


async def call_vision_api(
    api_key: str,
    screenshot_base64: str,
    prompt: str
) -> Dict[str, Any]:
    """调用视觉 AI API (GLM-4V)"""
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            "https://open.bigmodel.cn/api/paas/v4/chat/completions",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
            json={
                "model": "glm-4v-flash",
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{screenshot_base64}"
                                }
                            }
                        ]
                    }
                ],
                "max_tokens": 1024,
            }
        )

        data = response.json()
        return data


async def vision_node(state: AgentState) -> Dict[str, Any]:
    """视觉分析节点"""
    import os
    import json

    screenshot = state.get("screenshot_base64")
    if not screenshot:
        return {
            "page_understanding": "无截图数据",
            "observations": ["需要先获取截图"]
        }

    api_key = os.getenv("GLM_API_KEY", "")
    if not api_key:
        return {
            "page_understanding": "未配置 GLM_API_KEY",
            "observations": ["请配置视觉 AI API Key"]
        }

    # 构建提示
    current_step = state.get("current_step", 0)
    plan = state.get("plan", [])
    current_action = plan[current_step] if current_step < len(plan) else "继续执行"

    prompt = f"""{VISION_PROMPT}

## 当前任务
正在执行第 {current_step + 1} 步：{current_action}

请分析截图并决定下一步操作。
"""

    # 调用视觉 API
    try:
        result = await call_vision_api(api_key, screenshot, prompt)
        content = result.get("choices", [{}])[0].get("message", {}).get("content", "")

        # 解析 JSON
        try:
            if "```json" in content:
                json_str = content.split("```json")[1].split("```")[0]
            elif "{" in content:
                start = content.index("{")
                end = content.rindex("}") + 1
                json_str = content[start:end]
            else:
                json_str = "{}"

            vision_data = json.loads(json_str)
        except:
            vision_data = {"understanding": content, "action": {"type": "wait"}}

        # 构建浏览器操作
        action = vision_data.get("action", {})
        browser_action = None

        if action.get("type") == "click" and action.get("position"):
            browser_action = {
                "type": "click",
                "x": action["position"]["x"],
                "y": action["position"]["y"],
            }
        elif action.get("type") == "input" and action.get("content"):
            browser_action = {
                "type": "input",
                "text": action["content"],
            }
        elif action.get("type") == "scroll":
            browser_action = {"type": "scroll"}

        return {
            "page_understanding": vision_data.get("understanding", ""),
            "browser_actions": [browser_action] if browser_action else [],
            "observations": [vision_data.get("understanding", "")],
            "messages": [{
                "role": "vision",
                "content": vision_data.get("understanding", ""),
                "metadata": vision_data
            }]
        }

    except Exception as e:
        return {
            "page_understanding": f"视觉分析失败: {str(e)}",
            "observations": [f"视觉分析失败: {str(e)}"]
        }


class VisionAgent:
    """视觉代理类"""

    def __init__(self, api_key: str = ""):
        self.api_key = api_key

    async def analyze_screenshot(self, screenshot_base64: str, task: str = "") -> Dict[str, Any]:
        """分析截图"""
        result = await call_vision_api(self.api_key, screenshot_base64, task or VISION_PROMPT)
        return result

    async def identify_elements(self, screenshot_base64: str) -> list:
        """识别页面元素"""
        prompt = "识别截图中的所有可交互元素，返回元素列表和位置"
        result = await self.analyze_screenshot(screenshot_base64, prompt)
        return result.get("elements_found", [])
