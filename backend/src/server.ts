import { buildApp } from './app';
import { connectDatabase, disconnectDatabase } from './core/config/database';
import { env } from './core/config/env';

/**
 * Start the server
 */
async function start() {
  try {
    console.log('🚀 Starting Mereka Backend...');
    console.log(`📦 Environment: ${env.NODE_ENV}`);
    console.log(`🔧 Node version: ${process.version}`);

    // Connect to MongoDB
    await connectDatabase();

    // Build and start Fastify app
    const app = await buildApp();

    await app.listen({
      port: env.PORT,
      host: env.HOST,
    });

    console.log(`🎉 Server is running on http://${env.HOST}:${env.PORT}`);
    console.log(`📚 API Documentation: http://${env.HOST}:${env.PORT}/docs`);
    console.log(`🏥 Health Check: http://${env.HOST}:${env.PORT}/health`);
  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown
 */
async function shutdown() {
  try {
    console.log('\n🛑 Shutting down gracefully...');
    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
void start();
