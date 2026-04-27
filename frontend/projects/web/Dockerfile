# Build stage - just copy pre-built dist
FROM node:22-alpine AS runner

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S angular -u 1001 -G nodejs

# Copy pre-built dist from local build
# The build must be done locally before docker build
COPY --chown=angular:nodejs dist/web /app/dist/web

# Set environment variables
ENV NODE_ENV=production
ENV PORT=4000

# Switch to non-root user
USER angular

# Expose port 4000
EXPOSE 4000

# Start the SSR server
CMD ["node", "dist/web/server/server.mjs"]
