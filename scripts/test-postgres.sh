#!/bin/bash

# PostgreSQL Docker Integration Test Manager
# Manages a PostgreSQL Docker container for running integration tests

set -e

CONTAINER_NAME="postgres-test-591-crawler"
POSTGRES_USER="test_user"
POSTGRES_PASSWORD="test_password"
POSTGRES_DB="test_crawler"
POSTGRES_PORT="5433"
POSTGRES_VERSION="15-alpine"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} ✅ $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} ⚠️  $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} ❌ $1"
}

# Function to check if container exists
container_exists() {
    docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"
}

# Function to check if container is running
container_running() {
    docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"
}

# Function to check if PostgreSQL is ready
postgres_ready() {
    docker exec $CONTAINER_NAME pg_isready -U $POSTGRES_USER -d $POSTGRES_DB >/dev/null 2>&1
}

# Function to start PostgreSQL container
start_postgres() {
    log "🚀 Starting PostgreSQL test container..."
    
    if container_exists; then
        if container_running; then
            log_warning "Container $CONTAINER_NAME is already running"
            return 0
        else
            log "Starting existing container..."
            docker start $CONTAINER_NAME
        fi
    else
        log "Creating new PostgreSQL container..."
        docker run -d \
            --name $CONTAINER_NAME \
            -e POSTGRES_USER=$POSTGRES_USER \
            -e POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
            -e POSTGRES_DB=$POSTGRES_DB \
            -p $POSTGRES_PORT:5432 \
            postgres:$POSTGRES_VERSION
    fi
    
    # Wait for PostgreSQL to be ready
    log "⏳ Waiting for PostgreSQL to be ready..."
    local timeout=30
    local count=0
    
    while ! postgres_ready; do
        if [ $count -ge $timeout ]; then
            log_error "PostgreSQL failed to start within $timeout seconds"
            return 1
        fi
        sleep 1
        count=$((count + 1))
        echo -n "."
    done
    echo ""
    
    log_success "PostgreSQL is ready!"
    return 0
}

# Function to stop PostgreSQL container
stop_postgres() {
    log "🛑 Stopping PostgreSQL test container..."
    
    if container_running; then
        docker stop $CONTAINER_NAME
        log_success "Container stopped"
    else
        log_warning "Container is not running"
    fi
}

# Function to remove PostgreSQL container
remove_postgres() {
    log "🗑️  Removing PostgreSQL test container..."
    
    if container_exists; then
        if container_running; then
            docker stop $CONTAINER_NAME
        fi
        docker rm $CONTAINER_NAME
        log_success "Container removed"
    else
        log_warning "Container does not exist"
    fi
}

# Function to show container status
status_postgres() {
    log "📊 PostgreSQL test container status:"
    
    if container_exists; then
        if container_running; then
            echo -e "  Status: ${GREEN}Running${NC}"
            echo -e "  Container: $CONTAINER_NAME"
            echo -e "  Port: $POSTGRES_PORT"
            echo -e "  Database: $POSTGRES_DB"
            echo -e "  User: $POSTGRES_USER"
            
            if postgres_ready; then
                echo -e "  PostgreSQL: ${GREEN}Ready${NC}"
            else
                echo -e "  PostgreSQL: ${YELLOW}Starting...${NC}"
            fi
        else
            echo -e "  Status: ${YELLOW}Stopped${NC}"
        fi
    else
        echo -e "  Status: ${RED}Not created${NC}"
    fi
}

# Function to run database setup
setup_database() {
    log "🔧 Setting up test database..."
    
    if ! container_running; then
        log_error "PostgreSQL container is not running. Start it first with 'start' command."
        return 1
    fi
    
    if ! postgres_ready; then
        log_error "PostgreSQL is not ready yet. Please wait and try again."
        return 1
    fi
    
    # Set environment variables for Prisma
    export DATABASE_URL="postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@localhost:$POSTGRES_PORT/$POSTGRES_DB"
    export DATABASE_PROVIDER="postgresql"
    
    log "Environment variables set:"
    log "  DATABASE_PROVIDER: $DATABASE_PROVIDER"
    log "  DATABASE_URL: $DATABASE_URL"
    
    # Generate Prisma client with PostgreSQL schema
    log "🔨 Generating Prisma client..."
    npx prisma generate    
    # Push schema to database
    log "📤 Pushing schema to database..."
    npx prisma db push    
    log_success "Database setup complete!"
    echo ""
    echo -e "${BLUE}Connection details:${NC}"
    echo "  Host: localhost"
    echo "  Port: $POSTGRES_PORT"
    echo "  Database: $POSTGRES_DB"
    echo "  Username: $POSTGRES_USER"
    echo "  Password: $POSTGRES_PASSWORD"
    echo ""
    echo -e "${BLUE}Environment variables:${NC}"
    echo "  export DATABASE_URL=\"$DATABASE_URL\""
    echo "  export DATABASE_PROVIDER=\"$DATABASE_PROVIDER\""
}

# Function to run integration tests
run_tests() {
    log "🧪 Running database integration tests..."
    
    if ! container_running; then
        log_error "PostgreSQL container is not running. Start it first with 'start' command."
        return 1
    fi
    
    if ! postgres_ready; then
        log_error "PostgreSQL is not ready yet. Please wait and try again."
        return 1
    fi
    
    # Set environment variables
    export DATABASE_URL="postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@localhost:$POSTGRES_PORT/$POSTGRES_DB"
    export DATABASE_PROVIDER="postgresql"
    
    log "Running integration tests with PostgreSQL..."
    
    # First ensure schema is up to date
    npx prisma db push --force-reset
    
    # Run the integration tests
    bun test tests/integration/database.test.js
    
    local test_result=$?
    
    if [ $test_result -eq 0 ]; then
        log_success "Integration tests passed!"
    else
        log_error "Integration tests failed!"
    fi
    
    return $test_result
}

# Function to reset database
reset_database() {
    log "🔄 Resetting test database..."
    
    if ! container_running; then
        log_error "PostgreSQL container is not running. Start it first with 'start' command."
        return 1
    fi
    
    export DATABASE_URL="postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@localhost:$POSTGRES_PORT/$POSTGRES_DB"
    export DATABASE_PROVIDER="postgresql"
    
    npx prisma db push --force-reset
    log_success "Database reset complete!"
}

# Function to connect to database
connect() {
    log "🔗 Connecting to test database..."
    
    if ! container_running; then
        log_error "PostgreSQL container is not running. Start it first with 'start' command."
        return 1
    fi
    
    docker exec -it $CONTAINER_NAME psql -U $POSTGRES_USER -d $POSTGRES_DB
}

# Function to show logs
logs() {
    log "📝 Showing container logs..."
    docker logs $CONTAINER_NAME
}

# Function to show help
show_help() {
    echo "PostgreSQL Docker Integration Test Manager"
    echo ""
    echo "Usage: $0 <command>"
    echo ""
    echo "Commands:"
    echo "  start         Start PostgreSQL container"
    echo "  stop          Stop PostgreSQL container"
    echo "  remove        Remove PostgreSQL container"
    echo "  status        Show container status"
    echo "  setup         Setup database schema"
    echo "  test          Run integration tests"
    echo "  reset         Reset database (clear all data)"
    echo "  connect       Connect to database with psql"
    echo "  logs          Show container logs"
    echo "  help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start          # Start PostgreSQL"
    echo "  $0 setup          # Setup database"
    echo "  $0 test           # Run tests"
    echo "  $0 stop           # Stop when done"
}

# Main command handling
case "${1:-help}" in
    start)
        start_postgres
        ;;
    stop)
        stop_postgres
        ;;
    remove)
        remove_postgres
        ;;
    status)
        status_postgres
        ;;
    setup)
        setup_database
        ;;
    test)
        run_tests
        ;;
    reset)
        reset_database
        ;;
    connect)
        connect
        ;;
    logs)
        logs
        ;;
    help)
        show_help
        ;;
    *)
        log_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac