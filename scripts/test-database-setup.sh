#!/bin/bash

# Database Integration Test Setup Script
# Sets up a test database environment for running integration tests

set -e

echo "🗄️  Setting up database integration test environment..."

# Check if we should use PostgreSQL or SQLite
if [ "$USE_POSTGRESQL" = "true" ]; then
    echo "📊 Setting up PostgreSQL test environment..."
    
    # Start PostgreSQL container if not running
    CONTAINER_NAME="postgres-test-591"
    
    if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        echo "🚀 Starting PostgreSQL test container..."
        docker run -d \
            --name $CONTAINER_NAME \
            -e POSTGRES_USER=test_user \
            -e POSTGRES_PASSWORD=test_password \
            -e POSTGRES_DB=test_crawler \
            -p 5433:5432 \
            postgres:15-alpine
        
        echo "⏳ Waiting for PostgreSQL to be ready..."
        sleep 5
        
        # Wait for PostgreSQL to be ready
        until docker exec $CONTAINER_NAME pg_isready -U test_user -d test_crawler; do
            echo "Waiting for PostgreSQL..."
            sleep 2
        done
    else
        echo "✅ PostgreSQL container already running"
    fi
    
    # Set environment variables for PostgreSQL
    export DATABASE_URL="postgresql://test_user:test_password@localhost:5433/test_crawler"
    export DATABASE_PROVIDER="postgresql"
    
else
    echo "📊 Setting up SQLite test environment..."
    
    # Set environment variables for SQLite
    export DATABASE_URL="file:./data/test-crawler.db"
    export DATABASE_PROVIDER="sqlite"
    
    # Create data directory
    mkdir -p data
fi

echo "🔧 Environment variables:"
echo "  DATABASE_PROVIDER: $DATABASE_PROVIDER"
echo "  DATABASE_URL: $DATABASE_URL"

# Generate Prisma client
echo "🔨 Generating Prisma client..."
bun run db:generate

# Push schema to database
echo "📤 Pushing schema to database..."
bun run db:push

echo "✅ Database test environment ready!"
echo ""
echo "To run integration tests:"
echo "  bun test tests/integration/database.simple.test.js"
echo ""
echo "To clean up PostgreSQL container (if used):"
echo "  docker stop $CONTAINER_NAME && docker rm $CONTAINER_NAME"