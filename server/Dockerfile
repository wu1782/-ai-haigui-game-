# ============================================
# AI 海龟汤游戏 - 后端 Dockerfile (多阶段构建)
# ============================================

# ------------------------------------------
# 构建阶段
# ------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装依赖（包括 devDependencies 用于构建）
RUN npm ci && npm cache clean --force

# 复制服务器代码
COPY . .

# ------------------------------------------
# 生产阶段
# ------------------------------------------
FROM node:20-alpine AS production

WORKDIR /app

# 创建非 root 用户以提高安全性
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 复制 package 文件
COPY package*.json ./

# 只安装生产依赖
RUN npm ci --only=production && npm cache clean --force

# 复制构建产物（从 builder）
COPY --from=builder /app/server ./server

# 设置用户
USER nodejs

# 暴露端口
EXPOSE 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))" || exit 1

# 启动命令
CMD ["node", "server/index.js"]
