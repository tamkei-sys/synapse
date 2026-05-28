import tailwindcss from '@tailwindcss/vite';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    // Router plugin must run before React so it can regenerate routeTree.gen.ts.
    TanStackRouterVite({
      target: 'react',
      routesDirectory: 'src/routes',
      generatedRouteTree: 'src/routeTree.gen.ts',
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
  },
  build: {
    target: 'es2023',
    sourcemap: true,
  },
});
