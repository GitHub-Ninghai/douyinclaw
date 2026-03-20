#!/bin/bash
# 启动 API 服务

cd packages/server

echo "Starting API server on port ${API_PORT:-3001}..."

# 启动服务
node dist/index.js
