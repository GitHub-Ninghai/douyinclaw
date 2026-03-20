#!/bin/bash
# 启动 Web 服务

cd packages/web

echo "Starting Web server on port ${WEB_PORT:-3000}..."

# 启动服务
npm run dev
