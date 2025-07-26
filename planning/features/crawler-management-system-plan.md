# 591 Crawler Management System 擴充計畫

## 系統架構概覽

### 新增組件
1. **Management Dashboard** - Web 介面管理爬蟲任務
2. **Job Scheduler** - 定時任務調度系統  
3. **Filter Engine** - 進階資料篩選引擎
4. **Configuration Manager** - 統一配置管理
5. **Database Layer** - 持久化儲存層
6. **Execution Tracker** - 執行歷史追蹤系統
7. **State Manager** - 任務狀態管理
8. **Execution Lock** - 重複執行防護機制

## 詳細功能規劃

### 1. 爬蟲任務管理 (Crawler Job Management)
```javascript
// lib/jobManager.js - 新增檔案
- createJob(name, url, schedule, filters, notifications)
- updateJob(jobId, config) 
- deleteJob(jobId)
- listJobs()
- getJobStatus(jobId)
```

**功能特點:**
- 支援多個爬蟲任務同時運行
- 每個任務可設定獨立的 URL、篩選條件、通知設定
- 任務狀態追蹤 (pending, running, completed, failed)

### 2. 定時調度系統 (Job Scheduler)
```javascript
// lib/scheduler.js - 新增檔案  
- scheduleJob(jobId, cronExpression)
- cancelSchedule(jobId)
- getNextRun(jobId)
```

**時間設定支援:**
- Cron 表達式 (0 */2 * * * - 每2小時)
- 預設選項 (每小時/每日/每週)
- 一次性執行
- 手動觸發

### 3. 進階篩選引擎 (Advanced Filter Engine)
```javascript
// lib/filterEngine.js - 新增檔案
- applyFilters(properties, filters)
- validateFilters(filters)
```

**篩選條件:**
- **價格範圍** (min/max 租金)
- **地區限制** (特定捷運站/行政區)
- **房型要求** (房數/坪數/樓層)
- **關鍵字匹配** (標題包含/排除特定詞彙)
- **距離篩選** (捷運站距離上限)

### 4. 通知系統擴充 (Enhanced Notification System)
```javascript
// 擴充現有 lib/notification.js
- sendFilteredNotification(properties, notificationConfig)
- sendSilentNotification(properties)
- sendNoNotification(properties) // 僅記錄
```

**通知選項:**
- **正常通知** - 標準 Discord 推送
- **靜音通知** - Discord 無推送提醒
- **不通知** - 僅儲存結果不發送
- **分組通知** - 依篩選結果分類發送

### 5. 執行歷史追蹤系統 (Execution History Tracking)

```javascript
// lib/executionTracker.js - 新增檔案
class ExecutionTracker {
  // 記錄執行開始
  startExecution(jobId, trigger)
  // 記錄執行結果
  finishExecution(executionId, result, properties)
  // 取得執行歷史
  getExecutionHistory(jobId, limit, offset)
  // 取得執行詳情
  getExecutionDetails(executionId)
}
```

**執行記錄包含:**
- 執行 ID 與時間戳
- 觸發方式 (手動/定時/API)
- 執行狀態 (running, completed, failed, cancelled)
- 爬取結果統計 (總數/新增/篩選後)
- 執行耗時與錯誤訊息
- 通知發送狀態

### 6. 任務狀態管理 (Job State Management)

```javascript
// lib/stateManager.js - 新增檔案
class StateManager {
  // 檢查任務是否可執行
  canExecute(jobId)
  // 設定任務為執行中
  setJobRunning(jobId, executionId)
  // 清除執行中狀態
  clearJobRunning(jobId)
  // 取得任務當前狀態
  getJobState(jobId)
  // 強制停止任務 (緊急情況)
  forceStopJob(jobId)
}
```

**任務狀態定義:**
- `idle` - 閒置，可接受觸發
- `running` - 執行中，拒絕新觸發
- `scheduled` - 已排程等待執行
- `paused` - 暫停，不接受自動觸發
- `disabled` - 停用狀態

### 7. 重複執行防護機制 (Duplicate Execution Prevention)

```javascript
// lib/executionLock.js - 新增檔案
class ExecutionLock {
  // 嘗試取得執行鎖
  acquireLock(jobId, executionId)
  // 釋放執行鎖
  releaseLock(jobId, executionId)
  // 檢查鎖狀態
  isLocked(jobId)
  // 取得當前執行資訊
  getCurrentExecution(jobId)
}
```

### 8. Web 管理介面 (Web Management Dashboard)
```javascript
// web/app.js - 新增資料夾與檔案
// web/public/* - 靜態資源
// web/views/* - HTML 模板
```

**介面功能:**
- 任務列表與狀態監控
- 新增/編輯爬蟲任務表單
- 篩選條件視覺化設定
- 執行歷史與日誌檢視
- 即時任務觸發按鈕
- 任務狀態儀表板
- 即時執行進度追蹤

### 9. 資料庫層 (Database Layer)
```javascript
// lib/database.js - 新增檔案
- SQLite 本地資料庫 (初期)
- 支援後續升級至 PostgreSQL
```

**資料表結構:**
- `jobs` - 爬蟲任務配置
- `schedules` - 定時任務設定
- `filters` - 篩選條件
- `notifications` - 通知配置
- `job_runs` - 執行歷史 (已更名為 job_executions)
- `job_states` - 任務狀態
- `execution_locks` - 執行鎖定
- `properties` - 房產資料快照

## 資料庫設計詳細

### 新增資料表

```sql
-- 爬蟲任務主表
CREATE TABLE jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 定時排程表
CREATE TABLE schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  cron_expression TEXT NOT NULL,
  timezone TEXT DEFAULT 'Asia/Taipei',
  is_active BOOLEAN DEFAULT 1,
  next_run DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id)
);

-- 篩選條件表
CREATE TABLE filters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  filter_type TEXT NOT NULL, -- 'price', 'location', 'keywords', 'room_type', 'distance'
  filter_config JSON NOT NULL,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id)
);

-- 通知設定表
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  notification_type TEXT NOT NULL, -- 'normal', 'silent', 'none'
  webhook_url TEXT,
  template TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id)
);

-- 執行歷史表
CREATE TABLE job_executions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  execution_id TEXT UNIQUE NOT NULL,
  trigger_type TEXT NOT NULL, -- 'manual', 'scheduled', 'api'
  trigger_user TEXT,
  status TEXT NOT NULL, -- 'running', 'completed', 'failed', 'cancelled'
  start_time DATETIME NOT NULL,
  end_time DATETIME,
  duration_ms INTEGER,
  properties_found INTEGER DEFAULT 0,
  new_properties INTEGER DEFAULT 0,
  filtered_properties INTEGER DEFAULT 0,
  notifications_sent INTEGER DEFAULT 0,
  error_message TEXT,
  result_data JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id)
);

-- 任務狀態表
CREATE TABLE job_states (
  job_id INTEGER PRIMARY KEY,
  status TEXT NOT NULL, -- 'idle', 'running', 'scheduled', 'paused', 'disabled'
  current_execution_id TEXT,
  last_execution_time DATETIME,
  next_scheduled_time DATETIME,
  execution_count INTEGER DEFAULT 0,
  last_error TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id)
);

-- 執行鎖定表 (防止重複執行)
CREATE TABLE execution_locks (
  job_id INTEGER PRIMARY KEY,
  execution_id TEXT NOT NULL,
  locked_at DATETIME NOT NULL,
  locked_by TEXT, -- process_id 或 user_id
  expires_at DATETIME NOT NULL,
  FOREIGN KEY (job_id) REFERENCES jobs(id)
);

-- 房產資料快照表
CREATE TABLE property_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  execution_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  property_data JSON NOT NULL,
  is_new BOOLEAN DEFAULT 0,
  passed_filter BOOLEAN DEFAULT 0,
  notification_sent BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (execution_id) REFERENCES job_executions(execution_id)
);
```

## 檔案結構規劃

```
591-crawler/
├── lib/
│   ├── jobManager.js        # 新增 - 任務管理
│   ├── scheduler.js         # 新增 - 定時調度
│   ├── filterEngine.js      # 新增 - 篩選引擎
│   ├── database.js          # 新增 - 資料庫操作
│   ├── executionTracker.js  # 新增 - 執行歷史追蹤
│   ├── stateManager.js      # 新增 - 任務狀態管理
│   ├── executionLock.js     # 新增 - 重複執行防護
│   ├── notification.js      # 擴充 - 增強通知功能
│   └── ... (existing files)
├── web/                     # 新增 - Web 管理介面
│   ├── app.js              # Express 應用
│   ├── routes/             # API 路由
│   │   ├── jobs.js         # 任務管理路由
│   │   ├── executions.js   # 執行歷史路由
│   │   ├── schedules.js    # 排程管理路由
│   │   └── dashboard.js    # 儀表板路由
│   ├── public/             # 靜態資源
│   │   ├── css/           
│   │   ├── js/            
│   │   └── img/           
│   ├── views/              # HTML 模板
│   │   ├── dashboard.html  # 主儀表板
│   │   ├── jobs.html       # 任務管理
│   │   ├── history.html    # 執行歷史
│   │   └── settings.html   # 系統設定
│   └── middleware/         # Express 中介軟體
├── management-api.js        # 新增 - 管理 API 伺服器
├── data/
│   └── management.db       # 新增 - SQLite 資料庫
├── planning/              # 計畫文件
│   └── features/
│       └── crawler-management-system-plan.md
└── ... (existing files)
```

## API 端點設計

### 任務管理 API
```
POST   /api/jobs              # 建立新任務
GET    /api/jobs              # 取得任務列表  
GET    /api/jobs/:id          # 取得特定任務
PUT    /api/jobs/:id          # 更新任務
DELETE /api/jobs/:id          # 刪除任務
POST   /api/jobs/:id/run      # 手動執行任務
POST   /api/jobs/:id/cancel   # 取消執行中任務
PUT    /api/jobs/:id/pause    # 暫停任務
PUT    /api/jobs/:id/resume   # 恢復任務
POST   /api/jobs/:id/unlock   # 強制釋放鎖定
```

### 執行歷史 API
```
GET    /api/jobs/:id/executions     # 取得任務執行歷史
GET    /api/executions/:executionId # 取得特定執行詳情
GET    /api/jobs/:id/status         # 取得任務當前狀態
GET    /api/jobs/status             # 取得所有任務狀態總覽
```

### 排程管理 API
```
POST   /api/jobs/:id/schedule       # 設定任務排程
PUT    /api/jobs/:id/schedule       # 更新任務排程
DELETE /api/jobs/:id/schedule       # 刪除任務排程
GET    /api/schedules               # 取得所有排程
```

### 篩選與通知 API
```
POST   /api/filters/test            # 測試篩選條件
GET    /api/notifications           # 通知歷史
POST   /api/notifications/test      # 測試通知設定
```

## 執行結果詳細記錄

```javascript
// 每次執行的詳細結果
const executionResult = {
  executionId: "exec_20240122_143052_job1",
  jobId: 1,
  startTime: "2024-01-22T14:30:52.123Z",
  endTime: "2024-01-22T14:31:15.456Z",
  duration: 23333, // 毫秒
  status: "completed",
  trigger: {
    type: "scheduled", // manual, scheduled, api
    user: null, // 手動觸發時的使用者
    scheduledTime: "2024-01-22T14:30:00.000Z"
  },
  crawlResults: {
    url: "https://rent.591.com.tw/list?region=1&kind=0",
    totalFound: 25,
    newProperties: 3,
    duplicateProperties: 22,
    filteredOut: 1,
    passedFilter: 2
  },
  notifications: {
    sent: 2,
    silent: 1,
    failed: 0,
    skipped: 0
  },
  errors: [],
  properties: [] // 本次爬取的房產資料快照
};
```

## 重複執行防護邏輯

### 執行前檢查流程
```javascript
async function executeJob(jobId, triggerInfo) {
  // 1. 檢查任務是否存在且啟用
  const job = await getJob(jobId);
  if (!job || job.status === 'disabled') {
    throw new Error('Job not found or disabled');
  }

  // 2. 檢查是否已在執行中
  const currentState = await stateManager.getJobState(jobId);
  if (currentState.status === 'running') {
    throw new Error(`Job is already running (execution: ${currentState.executionId})`);
  }

  // 3. 嘗試取得執行鎖
  const executionId = generateExecutionId(jobId);
  const lockAcquired = await executionLock.acquireLock(jobId, executionId);
  if (!lockAcquired) {
    throw new Error('Unable to acquire execution lock');
  }

  try {
    // 4. 設定任務狀態為執行中
    await stateManager.setJobRunning(jobId, executionId);
    
    // 5. 開始執行並記錄
    const execution = await executionTracker.startExecution(jobId, triggerInfo);
    
    // 6. 實際執行爬蟲
    const result = await runCrawler(job, executionId);
    
    // 7. 記錄執行結果
    await executionTracker.finishExecution(executionId, result);
    
  } finally {
    // 8. 清理狀態和鎖定
    await stateManager.clearJobRunning(jobId);
    await executionLock.releaseLock(jobId, executionId);
  }
}
```

### 異常處理機制
```javascript
// 任務超時處理
const EXECUTION_TIMEOUT = 30 * 60 * 1000; // 30分鐘

// 定期清理過期鎖定
setInterval(async () => {
  await executionLock.cleanExpiredLocks();
}, 5 * 60 * 1000); // 每5分鐘檢查

// 系統重啟時恢復狀態
async function recoverSystemState() {
  const runningJobs = await stateManager.getRunningJobs();
  for (const job of runningJobs) {
    // 檢查是否真的還在執行，否則重置狀態
    await stateManager.clearJobRunning(job.id);
  }
}
```

## 使用者介面設計

### 任務列表頁面增強
```html
<!-- 狀態指示與控制按鈕 -->
<tr class="job-row" data-job-id="1">
  <td>
    <span class="status-indicator status-idle">●</span>
    房屋搜尋 - 台北市中正區
  </td>
  <td>每2小時</td>
  <td>2024-01-22 14:31:15</td>
  <td>2024-01-22 16:30:00</td>
  <td>
    <button class="btn btn-sm btn-primary" onclick="executeJob(1)">
      <i class="icon-play"></i> 立即執行
    </button>
    <button class="btn btn-sm btn-secondary" onclick="viewHistory(1)">
      <i class="icon-history"></i> 歷史
    </button>
  </td>
</tr>
```

### 執行歷史詳情
```html
<!-- 執行詳情彈窗 -->
<div class="execution-detail-modal">
  <h4>執行詳情 #exec_20240122_143052_job1</h4>
  <div class="execution-summary">
    <div class="stat-card">
      <span class="number">25</span>
      <span class="label">找到房源</span>
    </div>
    <div class="stat-card">
      <span class="number">3</span>
      <span class="label">新增房源</span>
    </div>
    <div class="stat-card">
      <span class="number">2</span>
      <span class="label">通過篩選</span>
    </div>
    <div class="stat-card">
      <span class="number">2</span>
      <span class="label">發送通知</span>
    </div>
  </div>
  <div class="execution-timeline">
    <!-- 執行步驟時間軸 -->
  </div>
</div>
```

## 實作階段規劃

### Phase 1: 基礎架構 (週 1-2)
- 資料庫設計與實作
- 任務管理核心功能
- 基本 API 端點
- 執行狀態管理

### Phase 2: 調度與鎖定系統 (週 3-4)
- Cron 定時任務實作
- 執行鎖定機制
- 重複執行防護
- 異常處理與恢復

### Phase 3: 歷史追蹤 (週 5-6)
- 執行歷史記錄
- 結果統計分析
- 執行詳情查詢
- 效能監控

### Phase 4: 篩選引擎 (週 7-8)
- 進階篩選邏輯
- 篩選條件驗證
- 篩選結果統計
- 效能優化

### Phase 5: Web 介面 (週 9-12)
- 管理後台開發
- 即時狀態更新
- 表單驗證與 UI
- 執行歷史檢視

### Phase 6: 通知增強 (週 13-14)
- 靜音/不通知選項
- 通知模板客製化
- 批次通知優化
- 通知失敗重試

### Phase 7: 測試與部署 (週 15-16)
- 單元測試與整合測試
- 系統壓力測試
- 文件撰寫
- 生產環境部署

## 相容性考量

- **向後相容** - 現有 CLI 和 API 功能保持不變
- **配置遷移** - 提供工具將現有設定遷移至新系統
- **漸進升級** - 可選擇性啟用管理功能
- **資料遷移** - 現有房產資料可匯入新系統
- **API 版本** - 支援 v1 (現有) 和 v2 (新增) API

## 技術棧

- **後端**: Node.js, Express.js, SQLite (可升級至 PostgreSQL)
- **前端**: HTML5, CSS3, JavaScript (Vanilla 或 Vue.js)
- **排程**: node-cron
- **即時通訊**: WebSocket 或 Server-Sent Events
- **測試**: Jest, Supertest
- **部署**: Docker, Docker Compose

## 效能考量

- **資料庫索引**: 執行時間、任務 ID、狀態等關鍵欄位
- **分頁查詢**: 執行歷史大量資料的分頁處理
- **快取策略**: 任務狀態和配置的記憶體快取
- **並發控制**: 資料庫連接池和執行緒管理
- **清理機制**: 定期清理過期資料和日誌

## 安全考量

- **輸入驗證**: 所有使用者輸入的嚴格驗證
- **SQL 注入防護**: 使用參數化查詢
- **權限控制**: 基本的使用者認證機制
- **敏感資訊**: Discord webhook URL 等的加密儲存
- **速率限制**: API 呼叫頻率限制

這個完整的擴充計畫涵蓋了所有需求功能，包括任務管理、定時觸發、執行歷史追蹤、狀態監控和重複執行防護。系統設計兼顧可擴展性、可維護性和效能，可以逐步實作並保持與現有系統的相容性。