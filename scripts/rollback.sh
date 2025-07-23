#!/bin/bash

# Rollback script to previous Docker image version
set -e

IMAGE_NAME="591-crawler"

# Check if previous tag file exists
if [ ! -f .docker-previous-tag ]; then
    echo "❌ No previous version found to rollback to"
    echo "   Deploy at least once before attempting rollback"
    exit 1
fi

# Read previous tag
PREVIOUS_TAG=$(cat .docker-previous-tag)
LATEST_TAG="${IMAGE_NAME}:latest"

echo "🔄 Rolling back to: ${PREVIOUS_TAG}"

# Check if previous image exists
if ! docker image inspect "${PREVIOUS_TAG}" > /dev/null 2>&1; then
    echo "❌ Previous image ${PREVIOUS_TAG} not found"
    echo "   Image may have been removed or never existed"
    exit 1
fi

# Stop current containers
echo "📦 Stopping current containers..."
docker-compose down

# Tag previous version as latest
echo "🏷️  Retagging previous version as latest..."
docker tag "${PREVIOUS_TAG}" "${LATEST_TAG}"

# Start containers with rolled back image
echo "🚀 Starting containers with previous version..."
docker-compose up -d

# Update tag files
echo "${PREVIOUS_TAG}" > .docker-current-tag

echo "✅ Rollback completed!"
echo "   Rolled back to: ${PREVIOUS_TAG}"
echo "   Use 'docker-compose logs -f' to monitor the application"