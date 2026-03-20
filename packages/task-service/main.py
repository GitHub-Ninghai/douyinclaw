"""
Task Service Main
任务调度服务入口
"""

import asyncio
import os
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import httpx
from motor.motor_asyncio import AsyncIOMotorClient

# 配置
BACKEND_URL = os.getenv("BACKEND_URL", "http://backend:3001")
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://mongodb:27017/douyinclaw")

# 数据库
client = AsyncIOMotorClient(MONGODB_URI)
db = client.get_database()

# 调度器
scheduler = AsyncIOScheduler()


async def trigger_spark_task():
    """触发续火花任务"""
    print(f"[{datetime.now()}] 🔥 触发续火花任务")

    async with httpx.AsyncClient(timeout=60) as client:
        try:
            response = await client.post(f"{BACKEND_URL}/api/spark/start")
            if response.status_code == 200:
                print(f"[{datetime.now()}] ✅ 续火花任务已启动")
            else:
                print(f"[{datetime.now()}] ❌ 启动失败: {response.text}")
        except Exception as e:
            print(f"[{datetime.now()}] ❌ 请求失败: {e}")


async def cleanup_old_logs():
    """清理旧日志"""
    print(f"[{datetime.now()}] 🧹 清理旧日志")

    # 删除 7 天前的日志
    from datetime import timedelta
    cutoff = datetime.now() - timedelta(days=7)

    result = await db.logs.delete_many({"created_at": {"$lt": cutoff}})
    print(f"[{datetime.now()}] 🗑️ 删除了 {result.deleted_count} 条日志")


async def check_scheduled_tasks():
    """检查定时任务状态"""
    print(f"[{datetime.now()}] ⏰ 检查定时任务")

    tasks = await db.scheduled_tasks.find({"enabled": True}).to_list(100)
    for task in tasks:
        print(f"  - {task.get('name')}: {task.get('schedule')}")


def setup_scheduler():
    """设置定时任务"""

    # 每天早上 9:00 续火花
    scheduler.add_job(
        trigger_spark_task,
        CronTrigger(hour=9, minute=0),
        id="spark_morning",
        name="早间续火花",
        replace_existing=True
    )

    # 每天中午 12:00 续火花
    scheduler.add_job(
        trigger_spark_task,
        CronTrigger(hour=12, minute=0),
        id="spark_noon",
        name="午间续火花",
        replace_existing=True
    )

    # 每天晚上 18:00 续火花
    scheduler.add_job(
        trigger_spark_task,
        CronTrigger(hour=18, minute=0),
        id="spark_evening",
        name="晚间续火花",
        replace_existing=True
    )

    # 每天凌晨 2:00 清理日志
    scheduler.add_job(
        cleanup_old_logs,
        CronTrigger(hour=2, minute=0),
        id="cleanup_logs",
        name="清理旧日志",
        replace_existing=True
    )

    # 每小时检查定时任务
    scheduler.add_job(
        check_scheduled_tasks,
        CronTrigger(minute=0),
        id="check_tasks",
        name="检查定时任务",
        replace_existing=True
    )

    print("✅ 定时任务已配置:")
    for job in scheduler.get_jobs():
        print(f"  - {job.id}: {job.name}")


async def main():
    """主函数"""
    print("=" * 50)
    print("  DouyinClaw Task Service")
    print("=" * 50)

    # 设置定时任务
    setup_scheduler()

    # 启动调度器
    scheduler.start()
    print("\n🚀 Task Service 已启动")
    print("按 Ctrl+C 停止\n")

    # 保持运行
    try:
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 正在停止...")
        scheduler.shutdown()
        print("✅ 已停止")


if __name__ == "__main__":
    asyncio.run(main())
