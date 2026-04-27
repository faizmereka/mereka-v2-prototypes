# =============================================================================
# Multi-stage Dockerfile for Mereka Admin v2 (Angular 21)
# Optimized for minimal image size and security
# =============================================================================

# Stage 1: Build Angular application
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (using npm install for flexibility with lock file)
RUN npm install --prefer-offline --no-audit

# Copy source code
COPY . .

# Build production bundle
RUN npm run build

# =============================================================================
# Stage 2: Production image with nginx
# =============================================================================
FROM nginx:1.27-alpine AS production

# Add labels
LABEL maintainer="Mereka Team"
LABEL description="Mereka Admin v2 - Angular SPA"

# Remove default nginx config
RUN rm -rf /etc/nginx/conf.d/default.conf

# Copy built Angular app from builder stage
# Angular 21 outputs to dist/mereka-admin-v2/browser
COPY --from=builder /app/dist/mereka-admin-v2/browser /usr/share/nginx/html

# Copy custom nginx config (will be overridden by ConfigMap in K8s)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create non-root user for nginx
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Use non-root user
USER nginx

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

