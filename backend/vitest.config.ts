import path from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',

    // Coverage configuration (80%+ target)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/tests/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        'scripts/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },

    // Setup files
    setupFiles: ['./tests/setup.ts'],

    // Test files
    include: ['tests/**/*.{test,spec}.ts', 'src/**/__tests__/**/*.{test,spec}.ts'],
    exclude: ['node_modules/**', 'dist/**'],

    // Test timeout
    testTimeout: 30000,
    hookTimeout: 30000,
  },

  // Path aliases (matching tsconfig - Core + Modules architecture)
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, './src/core'),
      '@core/models': path.resolve(__dirname, './src/core/models'),
      '@core/schemas': path.resolve(__dirname, './src/core/schemas'),
      '@core/services': path.resolve(__dirname, './src/core/services'),
      '@core/middlewares': path.resolve(__dirname, './src/core/middlewares'),
      '@core/config': path.resolve(__dirname, './src/core/config'),
      '@core/utils': path.resolve(__dirname, './src/core/utils'),
      '@core/types': path.resolve(__dirname, './src/core/types'),
      '@core/plugins': path.resolve(__dirname, './src/core/plugins'),
      '@core/constants': path.resolve(__dirname, './src/core/constants'),
      '@modules': path.resolve(__dirname, './src/modules'),
      '@jobs': path.resolve(__dirname, './src/jobs'),
      // Service aliases
      '@services/hub': path.resolve(__dirname, './src/core/services/hub'),
      '@services/payments': path.resolve(__dirname, './src/core/services/shared/payments'),
      '@services/shared': path.resolve(__dirname, './src/core/services/shared'),
      '@services/admin': path.resolve(__dirname, './src/core/services/admin'),
      '@services/web': path.resolve(__dirname, './src/core/services/web'),
      '@services/communications': path.resolve(
        __dirname,
        './src/core/services/shared/communications',
      ),
      '@services/auth': path.resolve(__dirname, './src/core/services/shared/auth'),
      '@services/infrastructure': path.resolve(
        __dirname,
        './src/core/services/shared/infrastructure',
      ),
      '@services/reference-data': path.resolve(
        __dirname,
        './src/core/services/admin/reference-data',
      ),
      // Schema aliases
      '@schemas/shared': path.resolve(__dirname, './src/core/schemas/shared'),
      '@schemas/hub': path.resolve(__dirname, './src/core/schemas/hub'),
      '@schemas/admin': path.resolve(__dirname, './src/core/schemas/admin'),
      '@schemas/web': path.resolve(__dirname, './src/core/schemas/web'),
      // Controller aliases
      '@controllers/admin': path.resolve(__dirname, './src/modules/admin/controllers'),
      '@controllers/web': path.resolve(__dirname, './src/modules/web/controllers'),
      '@controllers/hub': path.resolve(__dirname, './src/modules/hub/controllers'),
      '@controllers/shared': path.resolve(__dirname, './src/modules/shared'),
      // Route aliases
      '@routes/admin': path.resolve(__dirname, './src/modules/admin/routes'),
      '@routes/web': path.resolve(__dirname, './src/modules/web/routes'),
      '@routes/hub': path.resolve(__dirname, './src/modules/hub/routes'),
      '@routes/shared': path.resolve(__dirname, './src/modules/shared'),
    },
  },
});
