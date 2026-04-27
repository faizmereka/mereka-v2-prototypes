import { defineConfig } from 'tsup';

export default defineConfig({
  // Entry points
  entry: ['src/server.ts'],

  // Output
  outDir: 'dist/js',
  format: ['esm'],

  // Type declarations handled by tsc (Stage 1 = types, Stage 2 = JS)
  dts: false,

  // Source maps
  sourcemap: true,

  // Clean output directory
  clean: true,

  // Code splitting
  splitting: false,
  treeshake: true,

  // External dependencies (don't bundle these)
  external: [
    'firebase-admin',
    'jsonwebtoken',
    'mongoose',
    'fastify',
    '@fastify/cors',
    '@fastify/jwt',
    '@fastify/swagger',
    '@fastify/swagger-ui',
    '@fastify/cookie',
    '@fastify/schedule',
    'toad-scheduler',
    'zod',
    'uuid',
  ],

  // Minification (production only)
  minify: process.env.NODE_ENV === 'production',

  // Target
  target: 'node20',
  platform: 'node',

  // Environment variables
  env: {
    NODE_ENV: process.env.NODE_ENV || 'development',
  },

  // Watch mode (dev)
  onSuccess: process.env.WATCH === 'true' ? 'node dist/js/server.js' : undefined,

  // esbuild options
  esbuildOptions(options) {
    options.platform = 'node';
    options.target = 'node20';
  },
});
