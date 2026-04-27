# Mereka Backend - Production Dockerfile
# Multi-stage build for optimized image

# Stage 1: Dependencies
FROM node:20.11-alpine AS dependencies

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies (ignore scripts to skip husky)
RUN npm ci --only=production --legacy-peer-deps --ignore-scripts && \
    npm cache clean --force

# Stage 2: Build
FROM node:20.11-alpine AS build

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (including dev)
RUN npm ci --legacy-peer-deps

# Copy source code
COPY tsconfig.json tsconfig.build.json tsup.config.ts ./
COPY src ./src

# Build application
RUN npm run build

# Stage 3: Production
FROM node:20.11-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy dependencies
COPY --from=dependencies --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist

# Copy package.json (for version info)
COPY --chown=nodejs:nodejs package.json ./

# Create logs directory
RUN mkdir -p logs && chown -R nodejs:nodejs logs

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/js/server.js"]

