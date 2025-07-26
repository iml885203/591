#!/bin/bash

# 設置本地 Git Hooks 自動部署腳本

echo "Setting up Git hooks for automatic Docker deployment..."

# 創建 post-merge hook
cat > .git/hooks/post-merge << 'EOF'
#!/bin/bash

# 檢查是否是 main 分支
if [ "$(git branch --show-current)" = "main" ]; then
    echo "🚀 Detected merge to main branch, starting deployment..."
    
    # 執行部署腳本
    ./scripts/deploy-local.sh
fi
EOF

# 創建 post-checkout hook (當 git pull 有更新時)
cat > .git/hooks/post-checkout << 'EOF'
#!/bin/bash

# 如果是 main 分支且有新的 commit
if [ "$(git branch --show-current)" = "main" ] && [ "$1" != "$2" ]; then
    echo "🔄 Main branch updated, checking for deployment..."
    ./scripts/deploy-local.sh
fi
EOF

# 使 hooks 可執行
chmod +x .git/hooks/post-merge
chmod +x .git/hooks/post-checkout

echo "✅ Git hooks installed!"
echo "Now when you 'git pull' or merge to main, Docker will auto-deploy"