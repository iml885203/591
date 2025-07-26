# 開發環境設置指南

## 🚀 快速開始

### 1. 安裝依賴
```bash
bun install
```

### 2. 設置環境變數
```bash
# 複製環境變數模板
cp .env.example .env

# 編輯 .env 設置你的配置
# 至少需要設置:
# - DISCORD_WEBHOOK_URL (Discord通知)
# - API_KEY (API安全金鑰)
```

### 3. 啟動開發資料庫
```bash
# 啟動 PostgreSQL 開發和測試資料庫
bun run dev:db:start

# 等待資料庫啟動完成 (約30秒)
# 查看啟動狀態
bun run dev:db:logs
```

### 4. 設置資料庫Schema
```bash
# 推送 Prisma schema 到開發資料庫
bun run db:push

# 生成 Prisma 客戶端
bun run db:generate
```

### 5. 運行測試
```bash
# 單元測試
bun test tests/unit

# 整合測試 (需要資料庫)
bun test tests/integration
```

### 6. 啟動API服務
```bash
bun run api
# API 將在 http://localhost:3000 啟動
```

## 🗄️ 資料庫設置詳情

### 開發資料庫 (Port 5432)
- **用途**: 本地開發和API測試
- **資料庫**: `crawler_dev`
- **用戶**: `dev_user` / `dev_password`
- **連接字串**: `postgresql://dev_user:dev_password@localhost:5432/crawler_dev`

### 測試資料庫 (Port 5433)
- **用途**: 整合測試
- **資料庫**: `crawler_test`
- **用戶**: `test_user` / `test_password`
- **連接字串**: `postgresql://test_user:test_password@localhost:5433/crawler_test`

### pgAdmin 管理介面 (可選)
```bash
# 啟動 pgAdmin
bun run dev:pgadmin

# 訪問 http://localhost:8080
# 登入: admin@local.dev / admin123
```

## 📋 常用命令

### 資料庫管理
```bash
# 啟動開發資料庫
bun run dev:db:start

# 停止資料庫
bun run dev:db:stop

# 重置資料庫 (刪除所有數據)
bun run dev:db:reset

# 查看資料庫日誌
bun run dev:db:logs

# 資料庫狀態檢查
bun run db:status
```

### 開發工作流
```bash
# 1. 啟動資料庫
bun run dev:db:start

# 2. 推送Schema變更
bun run db:push

# 3. 運行測試
bun test

# 4. 啟動API
bun run api

# 5. 測試爬蟲
bun run crawler.js "https://rent.591.com.tw/list?region=1&kind=0"
```

### 測試相關
```bash
# 所有測試
bun test

# 單元測試
bun test tests/unit

# 整合測試
bun test tests/integration

# 資料庫整合測試
bun test tests/integration/database.test.js

# 測試覆蓋率
bun run test:coverage
```

## 🔧 故障排除

### 資料庫連接問題
```bash
# 檢查容器狀態
docker ps | grep postgres

# 檢查資料庫健康狀態
docker-compose -f docker-compose.dev.yml ps

# 重啟資料庫
bun run dev:db:reset
```

### 測試失敗
```bash
# 確保資料庫正在運行
bun run dev:db:start

# 等待資料庫完全啟動
sleep 30

# 推送最新Schema
bun run db:push

# 重新運行測試
bun test
```

### 端口衝突
如果端口被佔用，修改 `docker-compose.dev.yml` 中的端口映射：
```yaml
ports:
  - "5434:5432"  # 將5432改為其他端口
```

## 🌟 提示

1. **首次設置**: 資料庫啟動需要時間，等待健康檢查通過
2. **Schema變更**: 修改 `prisma/schema.prisma` 後運行 `bun run db:push`
3. **數據重置**: 使用 `bun run dev:db:reset` 清除開發數據
4. **性能**: 開發資料庫使用本地卷，數據會持久保存
5. **安全**: 開發環境密碼簡單，生產環境請使用強密碼