# Supabase Auth 設定指南 (簡化版)

## 🔐 本地開發環境設定

### 1. 基本測試
```bash
# 確保 Supabase 正在運行
supabase start

# 啟動前端
cd frontend
bun run dev
```

### 2. 在 Supabase Dashboard 中設定 Auth
訪問 http://localhost:54323 (Supabase Studio)

#### Auth 設定建議
- **Enable email confirmations**: 開發時關閉，production 可啟用
- **Enable phone confirmations**: 關閉
- **Minimum password length**: 6 字元

#### 預設管理員帳號
系統會自動建立預設管理員帳號：
- **Email**: admin@591crawler.com
- **密碼**: admin123456
- **狀態**: 已確認，可直接登入

⚠️ **安全提醒**: Production 環境記得修改密碼！

## 🚀 Production 環境設定

### 1. Supabase Cloud 專案設定
```
Settings > Auth > URL Configuration
- Site URL: https://your-domain.com
- Redirect URLs: https://your-domain.com/**

Settings > Auth > Email Auth
- Enable email confirmations: 建議啟用
```

### 2. 環境變數設定
```env
# Production .env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. 安全設定 (可選 - 上線前實作)
如需加強安全性，可啟用 Row Level Security：
```sql
-- 只有登入用戶可存取
ALTER TABLE queries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users only" ON queries
  FOR ALL USING (auth.uid() IS NOT NULL);
```

## ✅ 測試步驟

### 本地測試
1. 訪問 http://localhost:5174 
2. 應該自動跳轉到 /login
3. 註冊新用戶或登入
4. 成功登入後看到租屋列表

### Production 測試  
1. 部署到 production
2. 測試註冊/登入功能
3. 確認功能正常運作

## 🔧 故障排除

### 常見問題
1. **認證狀態不持久** - 檢查 localStorage 和 session 設定
2. **無法登入** - 檢查密碼強度和 Email 確認設定
3. **CORS 錯誤** - 檢查 Site URL 和 Redirect URLs 設定