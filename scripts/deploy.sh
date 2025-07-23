#!/bin/bash

# Deploy script with versioned Docker images
set -e

# Generate timestamp tag
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
IMAGE_NAME="591-crawler"
CURRENT_TAG="${IMAGE_NAME}:${TIMESTAMP}"
LATEST_TAG="${IMAGE_NAME}:latest"

echo "🚀 Deploying with tag: ${CURRENT_TAG}"

# Stop current containers
echo "📦 Stopping current containers..."
docker-compose down

# Build new image with timestamp tag
echo "🔨 Building new image..."
docker build -t "${CURRENT_TAG}" .

# Tag as latest
docker tag "${CURRENT_TAG}" "${LATEST_TAG}"

# Save current tag to file for rollback
echo "${CURRENT_TAG}" > .docker-current-tag

# Save previous tag for rollback (if exists)
if [ -f .docker-previous-tag ]; then
    cp .docker-current-tag .docker-previous-tag
else
    echo "${CURRENT_TAG}" > .docker-previous-tag
fi

# Start new containers
echo "🚀 Starting new containers..."
docker-compose up -d

echo "✅ Deployment completed!"
echo "   Current: ${CURRENT_TAG}"
echo "   Use 'bun run docker:rollback' to rollback if needed"