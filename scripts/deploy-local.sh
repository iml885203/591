#!/bin/bash

set -e  # Exit on any error

echo "🐋 Starting local Docker deployment..."

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 檢查 Docker 是否運行
if ! docker info > /dev/null 2>&1; then
    log_error "Docker is not running. Please start Docker first."
    exit 1
fi

# 檢查是否有 .env 文件
if [ ! -f ".env" ]; then
    log_warn ".env file not found. Creating from template..."
    cp .env.example .env 2>/dev/null || log_warn "No .env.example found"
fi

# 獲取當前 commit 信息
COMMIT_SHA=$(git rev-parse --short HEAD)
COMMIT_MSG=$(git log -1 --pretty=%B)
DEPLOY_TIME=$(date '+%Y-%m-%d %H:%M:%S')

log_info "Deploying commit: $COMMIT_SHA"
log_info "Commit message: $COMMIT_MSG"

# 停止現有容器
log_info "Stopping existing containers..."
docker-compose -f docker-compose.production.yml down 2>/dev/null || true

# 清理舊的 images (可選)
log_info "Cleaning up old images..."
docker image prune -f > /dev/null 2>&1 || true

# 構建並啟動新容器
log_info "Building and starting containers..."
docker-compose -f docker-compose.production.yml up -d --build

# 等待服務就緒
log_info "Waiting for services to be ready..."
sleep 10

# 健康檢查
log_info "Performing health check..."
for i in {1..30}; do
    if curl -f http://localhost:3001/health > /dev/null 2>&1; then
        log_info "✅ API is healthy!"
        break
    fi
    
    if [ $i -eq 30 ]; then
        log_error "❌ Health check failed after 30 attempts"
        docker compose -f docker-compose.production.yml logs
        exit 1
    fi
    
    sleep 2
done

# 檢查資料庫連接
log_info "Checking database connection..."
if docker-compose -f docker-compose.production.yml exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
    log_info "✅ Database is ready!"
else
    log_warn "⚠️ Database connection check failed"
fi

# 顯示部署信息
echo ""
log_info "🎉 Deployment completed successfully!"
echo ""
echo "📊 Deployment Summary:"
echo "  • Commit: $COMMIT_SHA"
echo "  • Time: $DEPLOY_TIME"
echo "  • API: http://localhost:3001"
echo "  • Health: http://localhost:3001/health"
echo "  • Swagger: http://localhost:3001/swagger"
echo ""

# 發送維護通知
if [ -n "$MAINTENANCE_WEBHOOK_URL" ] && command -v curl > /dev/null; then
    log_info "Sending maintenance notification..."
    curl -X POST "$MAINTENANCE_WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d "{
            \"embeds\": [{
                \"title\": \"🚀 Local Deployment Successful\",
                \"description\": \"591 Crawler deployed to local Docker\",
                \"color\": 3066993,
                \"fields\": [
                    {\"name\": \"Commit\", \"value\": \"$COMMIT_SHA\", \"inline\": true},
                    {\"name\": \"Time\", \"value\": \"$DEPLOY_TIME\", \"inline\": true},
                    {\"name\": \"Message\", \"value\": \"$COMMIT_MSG\", \"inline\": false},
                    {\"name\": \"URL\", \"value\": \"http://localhost:3001\", \"inline\": true}
                ]
            }]
        }" > /dev/null 2>&1 || log_warn "Maintenance notification failed"
fi

log_info "🔄 Use 'docker-compose -f docker-compose.production.yml logs -f' to view logs"