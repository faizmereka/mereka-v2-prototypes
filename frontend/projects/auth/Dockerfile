# =============================================================================
# Dockerfile for Mereka Auth v2 (Angular 21)
# Uses pre-built dist - run `ng build auth --configuration=production` first
# =============================================================================

FROM nginx:1.27-alpine

# Add labels
LABEL maintainer="Mereka Team"
LABEL description="Mereka Auth v2 - Angular SPA"

# Remove default nginx config
RUN rm -rf /etc/nginx/conf.d/default.conf

# Copy pre-built Angular app (must run ng build auth locally first)
COPY dist/auth/browser /usr/share/nginx/html

# Copy custom nginx config
COPY projects/auth/nginx.conf /etc/nginx/conf.d/default.conf

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
