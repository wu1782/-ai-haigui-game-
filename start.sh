#!/bin/bash
# ============================================
# AI 海龟汤游戏 - 启动脚本
# ============================================

set -e

echo "============================================"
echo "AI 海龟汤游戏 - Docker 启动脚本"
echo "============================================"

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo "[ERROR] Docker 未运行，请先启动 Docker"
    exit 1
fi

# 启动服务
echo "[INFO] 启动 Docker 服务..."

if docker compose version > /dev/null 2>&1; then
    docker compose up -d
    echo "[INFO] 服务状态:"
    docker compose ps
else
    docker-compose up -d
    echo "[INFO] 服务状态:"
    docker-compose ps
fi

echo "============================================"
echo "服务已启动!"
echo "前端地址: http://localhost"
echo "后端地址: http://localhost:3001"
echo "============================================"
