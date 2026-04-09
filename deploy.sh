#!/bin/bash
# ============================================
# AI 海龟汤游戏 - 部署脚本
# ============================================

set -e

echo "============================================"
echo "AI 海龟汤游戏 - Docker 部署脚本"
echo "============================================"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查命令
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 打印状态
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查依赖
print_status "检查依赖..."

if ! command_exists docker; then
    print_error "Docker 未安装，请先安装 Docker"
    exit 1
fi

if ! command_exists docker-compose; then
    if command_exists docker; then
        print_warning "使用 docker compose (v2)..."
    else
        print_error "Docker Compose 未安装"
        exit 1
    fi
fi

# 创建网络 (如果不存在)
print_status "创建 Docker 网络..."
docker network create app-network 2>/dev/null || true

# 拉取最新代码 (如果是 git 仓库)
if [ -d ".git" ]; then
    print_status "拉取最新代码..."
    git pull origin main 2>/dev/null || true
fi

# 构建并启动服务
print_status "构建并启动 Docker 服务..."

# 使用 docker compose v2 语法
if docker compose version >/dev/null 2>&1; then
    docker compose down --remove-orphans
    docker compose build --no-cache
    docker compose up -d
else
    docker-compose down --remove-orphans
    docker-compose build --no-cache
    docker-compose up -d
fi

# 等待服务启动
print_status "等待服务启动..."
sleep 10

# 检查服务状态
print_status "检查服务状态..."
if docker compose version >/dev/null 2>&1; then
    docker compose ps
else
    docker-compose ps
fi

# 检查后端健康状态
print_status "检查后端健康状态..."
for i in {1..10}; do
    if curl -sf http://localhost:3001/api/health > /dev/null 2>&1; then
        print_status "后端服务健康"
        break
    fi
    print_warning "等待后端服务启动... ($i/10)"
    sleep 3
done

# 检查前端
print_status "检查前端服务..."
if curl -sf http://localhost/ > /dev/null 2>&1; then
    print_status "前端服务正常"
else
    print_warning "前端服务可能未正常启动"
fi

print_status "============================================"
print_status "部署完成!"
print_status "============================================"
print_status "前端地址: http://localhost"
print_status "后端地址: http://localhost:3001"
print_status "API 文档: http://localhost:3001/api/docs"
print_status "============================================"
