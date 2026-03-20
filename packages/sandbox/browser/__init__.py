"""
Browser Manager
浏览器自动化管理器
"""

import asyncio
import base64
from typing import Optional, Dict, Any
from playwright.async_api import async_playwright, Browser, BrowserContext, Page


class BrowserManager:
    """浏览器管理器"""

    def __init__(self):
        self.playwright = None
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        self.is_ready = False

    async def initialize(self):
        """初始化浏览器"""
        self.playwright = await async_playwright().start()

        self.browser = await self.playwright.chromium.launch(
            headless=False,
            args=[
                '--disable-blink-features=AutomationControlled',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
            ]
        )

        self.context = await self.browser.new_context(
            viewport={'width': 1280, 'height': 800},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            locale='zh-CN',
        )

        # 注入反检测脚本
        await self.context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
        """)

        self.page = await self.context.new_page()
        self.is_ready = True

        print("✅ Browser initialized")

    async def close(self):
        """关闭浏览器"""
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
        self.is_ready = False

    async def navigate(self, url: str) -> Dict[str, Any]:
        """导航到 URL"""
        if not self.page:
            return {"success": False, "error": "浏览器未初始化"}

        try:
            await self.page.goto(url, wait_until='domcontentloaded', timeout=30000)
            return {"success": True, "url": url}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def click(self, x: int, y: int) -> Dict[str, Any]:
        """点击指定位置"""
        if not self.page:
            return {"success": False, "error": "浏览器未初始化"}

        try:
            await self.page.mouse.click(x, y)
            return {"success": True, "position": (x, y)}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def input_text(self, text: str) -> Dict[str, Any]:
        """输入文本"""
        if not self.page:
            return {"success": False, "error": "浏览器未初始化"}

        try:
            await self.page.keyboard.type(text, delay=50)
            return {"success": True, "input": text}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def press_key(self, key: str) -> Dict[str, Any]:
        """按键"""
        if not self.page:
            return {"success": False, "error": "浏览器未初始化"}

        try:
            await self.page.keyboard.press(key)
            return {"success": True, "key": key}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def scroll(self, direction: str = "down", distance: int = 300) -> Dict[str, Any]:
        """滚动页面"""
        if not self.page:
            return {"success": False, "error": "浏览器未初始化"}

        try:
            if direction == "down":
                await self.page.mouse.wheel(0, distance)
            else:
                await self.page.mouse.wheel(0, -distance)
            return {"success": True, "direction": direction}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def screenshot(self, full_page: bool = False) -> str:
        """截图"""
        if not self.page:
            return ""

        try:
            screenshot_bytes = await self.page.screenshot(
                type='jpeg',
                quality=60,
                full_page=full_page
            )
            return base64.b64encode(screenshot_bytes).decode('utf-8')
        except Exception as e:
            print(f"截图失败: {e}")
            return ""

    async def execute_action(self, action: Dict[str, Any]) -> Dict[str, Any]:
        """执行浏览器操作"""
        action_type = action.get("type")

        if action_type == "navigate":
            return await self.navigate(action.get("url", ""))

        elif action_type == "click":
            return await self.click(action.get("x", 0), action.get("y", 0))

        elif action_type == "input":
            return await self.input_text(action.get("text", ""))

        elif action_type == "press":
            return await self.press_key(action.get("key", "Enter"))

        elif action_type == "scroll":
            return await self.scroll(action.get("direction", "down"))

        elif action_type == "screenshot":
            screenshot = await self.screenshot()
            return {"success": True, "screenshot": screenshot}

        elif action_type == "wait":
            duration = action.get("duration", 1000)
            await asyncio.sleep(duration / 1000)
            return {"success": True, "waited": duration}

        elif action_type == "hover":
            x, y = action.get("x", 0), action.get("y", 0)
            await self.page.mouse.move(x, y)
            return {"success": True, "hovered": (x, y)}

        else:
            return {"success": False, "error": f"未知操作类型: {action_type}"}

    async def get_page_content(self) -> str:
        """获取页面内容"""
        if not self.page:
            return ""
        return await self.page.content()

    async def get_url(self) -> str:
        """获取当前 URL"""
        if not self.page:
            return ""
        return self.page.url

    async def save_session(self, path: str):
        """保存会话"""
        if self.context:
            await self.context.storage_state(path=path)

    async def load_session(self, path: str):
        """加载会话"""
        if self.context and os.path.exists(path):
            # 需要重新创建 context
            pass
