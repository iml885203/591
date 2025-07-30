# 591 Crawler Docker Image
FROM oven/bun:alpine

# Set working directory
WORKDIR /app

# Install system dependencies for web scraping
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Tell Puppeteer to skip installing Chromium since we already have it
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser


# Copy package files and scripts (needed for postinstall hooks)
COPY package.json bun.lock ./
COPY scripts/ ./scripts/

# Install dependencies
RUN bun install --frozen-lockfile --production

# Copy application source code
COPY . .

# Generate Prisma client
RUN bun run db:generate

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Create data directory and debug HTML directory with proper permissions
RUN mkdir -p /app/data /app/debug-html && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose API port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD bun -e "const http = require('http'); \
        const options = { hostname: 'localhost', port: 3000, path: '/health', timeout: 5000 }; \
        const req = http.request(options, (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }); \
        req.on('error', () => process.exit(1)); \
        req.end();"

# Debug environment variables at startup
CMD ["sh", "-c", "echo 'Environment variables:' && echo 'NODE_ENV='$NODE_ENV && echo 'API_KEY='$API_KEY && echo 'PORT='$PORT && echo 'API_PORT='$API_PORT && echo 'Starting API server...' && bun run api"]

# Labels for metadata
LABEL maintainer="iml885203" \
      version="1.0.0" \
      description="591.com.tw property crawler with REST API" \
      app.name="591-crawler" \
      app.version="1.0.0"