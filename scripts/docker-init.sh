#!/bin/bash
# Docker 初始化脚本

# 磀查是否在 Docker 容器中运行
if [ "$DOCKER_ENV" != "true" ]; then
    echo "Not running in Docker container, skipping initialization."
    exit 0
fi

# 等待 Redis
echo "Waiting for Redis..."
until redis-cli ping > /dev/null 2>&1; do
    sleep 1
done

echo "Redis is ready"

# 运行数据库迁移
echo "Running database migrations..."
cd packages/core && npx drizzle-kit push

if [ $? -ne 0 ]; then
    echo "Database migrations completed"
else
    echo "Database migration failed"
    exit 1
fi

