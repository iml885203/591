# 雲端部署計劃 (Cloud Deployment Plan)

## 📋 概述

將 591 爬蟲系統部署到免費雲端平台，實現基於 Git Tag 的自動化部署流程。

## 🎯 目標

1. **免費部署**: 選擇適合的免費雲端平台
2. **自動化**: Git Tag 觸發自動部署
3. **持續性**: 24/7 運行的爬蟲服務
4. **監控**: 基本的健康檢查和日誌

## 🏗️ 推薦方案

### 選項一: Railway (推薦)

**優勢:**
- 每月 5 美元免費額度 (500小時運行時間)
- 支援 Docker 部署
- 自動 HTTPS
- 內建 GitHub 整合
- 簡單的環境變數管理

**配置步驟:**
1. 在 Railway 創建專案
2. 連接 GitHub 倉庫
3. 配置 Dockerfile 部署
4. 設定環境變數
5. 配置自動部署觸發條件

### 選項二: Render

**優勢:**
- 免費方案支援靜態站點和 Web 服務
- 自動 SSL 憑證
- GitHub 整合
- 支援 Docker

**限制:**
- 免費版本服務會在 15 分鐘無活動後休眠
- 重啟時間較長 (約 30 秒)

### 選項三: Fly.io

**優勢:**
- 免費方案包含 3 個共享 CPU VM
- 全球部署
- 支援 Docker
- 優秀的效能

**配置相對複雜但功能強大**

## 📦 部署架構

```
GitHub Repository
    ↓ (Git Tag Push)
Railway/Render Platform
    ↓ (Build Trigger)
Docker Container Build
    ↓ (Auto Deploy)
Production Environment
    ↓ (Health Check)
Discord Notification
```

## 🔧 實作步驟

### Phase 1: 準備部署檔案

1. **更新 Dockerfile**
   ```dockerfile
   # 確保 health check 端點正常
   HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
     CMD curl -f http://localhost:3000/health || exit 1
   ```

2. **創建 railway.toml** (Railway 專用)
   ```toml
   [build]
   builder = "dockerfile"
   
   [deploy]
   startCommand = "bun run api"
   healthcheckPath = "/health"
   restartPolicyType = "on_failure"
   ```

3. **創建部署腳本**
   ```bash
   # scripts/deploy-cloud.sh
   #!/bin/bash
   echo "🚀 Preparing cloud deployment..."
   # 環境檢查和部署準備
   ```

### Phase 2: 環境變數配置

在雲端平台設定以下環境變數:
```env
NODE_ENV=production
DISCORD_WEBHOOK_URL=<your_webhook_url>
NOTIFICATION_DELAY=1000
API_PORT=3000
```

### Phase 3: CI/CD 自動化

1. **GitHub Actions 設定** (.github/workflows/deploy.yml)
   ```yaml
   name: Deploy to Cloud
   on:
     push:
       tags:
         - 'v*'
   
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - name: Deploy to Railway
           uses: railway-app/railway-action@v1
           with:
             api-token: ${{ secrets.RAILWAY_TOKEN }}
             command: up --detach
   ```

2. **自動版本標記**
   - 使用現有的 `scripts/update-version.js`
   - 確保版本標記會觸發部署

### Phase 4: 監控和日誌

1. **健康檢查端點增強**
   ```javascript
   // 在 api.js 中增強 /health 端點
   app.get('/health', (req, res) => {
     res.status(200).json({
       status: 'healthy',
       timestamp: new Date().toISOString(),
       version: process.env.npm_package_version,
       uptime: process.uptime()
     });
   });
   ```

2. **基本監控**
   - 使用雲端平台內建監控
   - 設定 Discord 通知異常狀況

## 💰 成本分析

| 平台 | 免費額度 | 限制 | 適用性 |
|------|----------|------|--------|
| Railway | $5/月 額度 | 500小時運行時間 | ✅ 推薦 |
| Render | 750小時/月 | 休眠機制 | ⚠️ 有限制 |
| Fly.io | 3個VM | 配置複雜 | ✅ 進階用戶 |

## 🚀 部署檢查清單

- [ ] 選擇雲端平台 (推薦 Railway)
- [ ] 創建平台帳號並連接 GitHub
- [ ] 配置環境變數
- [ ] 測試 Docker 容器本地運行
- [ ] 設定自動部署觸發條件
- [ ] 配置域名 (可選)
- [ ] 設定監控和告警
- [ ] 測試完整部署流程
- [ ] 文件化部署流程

## 📚 後續優化

1. **自定義域名**: 設定 custom domain
2. **CDN**: 如需要靜態資源加速
3. **資料庫**: 準備資料持久化 (見資料持久化計劃)
4. **監控增強**: 集成 Sentry 或其他監控服務
5. **負載均衡**: 多區域部署 (進階)

## 🔗 相關資源

- [Railway 文件](https://docs.railway.app/)
- [Render 文件](https://render.com/docs)
- [Fly.io 文件](https://fly.io/docs/)
- [Docker 最佳實踐](https://docs.docker.com/develop/dev-best-practices/)