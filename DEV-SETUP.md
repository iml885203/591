# Development Environment Setup

## 🚀 Quick Start

### 1. Install Dependencies
```bash
bun install
```

### 2. Setup Environment Variables
```bash
# Copy environment template
cp .env.example .env

# Edit .env to configure your settings
# Required variables:
# - DATABASE_URL (Supabase PostgreSQL connection)
# - DISCORD_WEBHOOK_URL (Discord notifications)
# - API_KEY (API security key)
```

### 3. Setup Database
```bash
# Run database migrations
bun run db:migrate

# Generate Prisma Client
bun run db:generate
```

### 4. Run Tests
```bash
# Unit tests
bun test tests/unit

# Integration tests (using Supabase)
bun test tests/integration
```

### 5. Start API Server
```bash
bun run api
# API will start at http://localhost:3000
```

## 🗄️ Supabase Setup

### Create Supabase Project
1. Go to [Supabase](https://supabase.com) and create an account
2. Create a new project
3. Go to Settings > Database to find connection details
4. Copy the CONNECTION STRING to `DATABASE_URL` in `.env`

### DATABASE_URL Format
```
postgresql://postgres:[YOUR-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres
```

## 📋 Common Commands

### Database Management
```bash
# Run migrations
bun run db:migrate

# Check migration status
bun run db:status

# Open database management interface
bun run db:studio

# Reset database (development only)
bunx prisma migrate reset --force
```

### Development Workflow
```bash
# 1. Setup environment variables (first time)
cp .env.example .env
# Edit .env to set DATABASE_URL

# 2. Run migrations
bun run db:migrate

# 3. Run tests
bun test

# 4. Start API
bun run api

# 5. Test crawler
bun run cli.js "https://rent.591.com.tw/list?region=1&kind=0"
```

### Testing
```bash
# All tests
bun test

# Unit tests
bun test tests/unit

# Integration tests (using Supabase)
bun test tests/integration

# Test coverage
bun run test:coverage
```

## 🔧 Troubleshooting

### Database Connection Issues
```bash
# Check DATABASE_URL configuration
echo $DATABASE_URL

# Test database connection
bun run db:status
```

### Test Failures
```bash
# Ensure DATABASE_URL is correctly set
cat .env | grep DATABASE_URL

# Ensure migrations are applied
bun run db:migrate

# Re-run tests
bun test
```

## 🌟 Tips

1. **Supabase Setup**: Ensure DATABASE_URL correctly points to your Supabase project
2. **Schema Changes**: After modifying `prisma/schema.prisma`, run `bun run db:migrate`
3. **Data Management**: Use `bun run db:studio` for visual database management
4. **Test Isolation**: Integration tests automatically clean up test data