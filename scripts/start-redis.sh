#!/bin/bash

# Redis 启动脚本 (Windows)

# 检查 Redis 是否已运行
echo "Checking Redis..."

# 尘治检查 Redis 是否运行
$redis_cli ping > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "Redis is already running"
    exit 0
else
    echo "Redis is not running. Please start Redis manually or using Docker:"
    echo ""
    echo "Option 1: Install Docker Desktop and echo "  Download from: https://www.docker.com/products/docker-desktop"
    echo ""
    echo "Option 2: Use Docker Compose"
    echo "  Run: docker compose up -d redis"
    echo ""
    echo "Option 3: Install Redis for Windows"
    echo "  Download from: https://github.com/microsoftarchive/redis/releases"
    echo "  Extract and run redis-server.exe"
    exit 1
fi
