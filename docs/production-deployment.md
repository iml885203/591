# Production 部署指南

## ⚠️ 重要安全提醒

**絕對不要在 Production 環境執行以下命令：**
```bash
supabase db reset  # 💥 會刪除所有生產資料！
```

## 🚀 正確的部署流程

### 1. 首次部署

#### 1.1 設定 Supabase Cloud 專案
1. 在 https://supabase.com 建立新專案
2. 獲取 production 環境變數：
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`

#### 1.2 設定環境變數
```env
# Production .env
DATABASE_URL=postgresql://postgres.xxx:password@xxx.supabase.co:5432/postgres
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 1.3 執行資料庫遷移（安全）
```bash
# 只建立 schema，不會刪除資料
bunx prisma migrate deploy
```

#### 1.4 建立管理員帳號（只執行一次）

**方法 1: 使用環境變數（推薦）**
```bash
# 設定管理員密碼環境變數
export ADMIN_PASSWORD="your-very-secure-password-here"

# 在 Supabase 中設定並執行 seed script
SELECT set_config('app.admin_password', 'your-very-secure-password-here', false);
```

然後執行 seed script 或手動執行：

**方法 2: 手動建立（在 Supabase Dashboard > SQL Editor）**
```sql
-- 只在首次部署時執行
-- ⚠️ 請將 YOUR_SECURE_PASSWORD 替換為真正的強密碼
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, last_sign_in_at, raw_app_meta_data,
    raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated', 'authenticated',
    'admin@591crawler.com',
    crypt('YOUR_SECURE_PASSWORD', gen_salt('bf')),
    NOW(), NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{}', NOW(), NOW(), '', '', '', ''
) ON CONFLICT (email) DO NOTHING;
```

**密碼設定建議：**
- 建議使用強密碼以確保系統安全
- 避免使用預設密碼 `CHANGE_ME_IN_PRODUCTION` 於正式環境

### 2. 後續更新部署

```bash
# 1. 推送程式碼變更
git push origin main

# 2. 自動觸發 GitHub Actions
# 3. CI/CD 會執行：
#    - bunx prisma migrate deploy  # 安全的 schema 更新
#    - bun run build              # 編譯前端
#    - Docker 容器重啟             # 部署新版本
```

### 3. GitHub Actions 設定

```yaml
name: Deploy to Production
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: self-hosted
    steps:
      - uses: actions/checkout@v3
      
      - name: Install dependencies
        run: bun install
        
      - name: Run database migrations (SAFE)
        run: bunx prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          
      - name: Build frontend
        run: cd frontend && bun run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
          
      - name: Restart Docker containers
        run: docker-compose -f docker-compose.production.yml up -d --build
```

## 🛡️ 安全檢查清單

### 資料庫遷移
- [ ] ✅ 使用 `prisma migrate deploy`
- [ ] ❌ 絕不使用 `supabase db reset`
- [ ] ✅ 測試遷移在 staging 環境
- [ ] ✅ 備份生產資料庫

### 環境變數
- [ ] ✅ 使用 production Supabase 專案
- [ ] ✅ 設定強密碼給管理員帳號
- [ ] ✅ 確認 API keys 正確
- [ ] ✅ 使用 HTTPS

### 部署流程
- [ ] ✅ 程式碼通過所有測試
- [ ] ✅ 在 staging 環境驗證
- [ ] ✅ 監控部署過程
- [ ] ✅ 驗證功能正常運作

## 🔧 故障排除

### 問題：遷移失敗
```bash
# 檢查遷移狀態
bunx prisma migrate status

# 如果需要，手動執行特定遷移
bunx prisma migrate resolve --applied "20250726173213_init"
```

### 問題：管理員帳號無法登入
1. 檢查 Supabase Dashboard > Authentication > Users
2. 確認 Email 已確認
3. 重設密碼（如果需要）

### 問題：前端無法連接資料庫
1. 檢查 `VITE_SUPABASE_URL` 是否正確
2. 檢查 `VITE_SUPABASE_ANON_KEY` 是否正確
3. 確認 Supabase 專案設定正確