# Multi-stage Dockerfile for Angular apps
# Usage: docker build --build-arg APP_NAME=web -t mereka-web .
# For SSR apps (web): Uses Node.js server
# For SPA apps (app, admin, auth): Uses nginx

# Stage 1: Build
FROM node:22-alpine AS builder

ARG APP_NAME
ARG BUILD_CONFIG=production
ENV APP_NAME=${APP_NAME}
ENV BUILD_CONFIG=${BUILD_CONFIG}

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies using lockfile
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build the specific app with the specified configuration
RUN npx ng build ${APP_NAME} --configuration=${BUILD_CONFIG}

# Stage 2a: SSR Server (for web)
FROM node:22-alpine AS ssr-runner

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S angular -u 1001 -G nodejs

# Copy built SSR app
COPY --from=builder --chown=angular:nodejs /app/dist/web /app/dist/web

	ENV NODE_ENV=production
	# SSR runner runs as non-root; bind to an unprivileged port.
	ENV PORT=4000
	
	USER angular
	EXPOSE 4000

CMD ["node", "dist/web/server/server.mjs"]

# Stage 2b: Nginx (for SPA apps) - using unprivileged nginx for non-root
FROM nginxinc/nginx-unprivileged:alpine AS nginx-runner

ARG APP_NAME
ENV APP_NAME=${APP_NAME}

# Copy nginx config (must be writable by nginx user)
COPY --chown=nginx:nginx nginx.conf /etc/nginx/nginx.conf

# Copy built app from builder
COPY --from=builder --chown=nginx:nginx /app/dist/${APP_NAME}/browser /usr/share/nginx/html

# nginx-unprivileged runs on port 8080 by default
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
