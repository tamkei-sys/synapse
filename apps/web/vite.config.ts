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
    // 0.0.0.0 so the dev server is reachable from outside the dev container
    // through the docker-compose port forward.
    host: true,
    port: 5173,
    strictPort: true,
  },
  optimizeDeps: {
    // mermaid は大きく遅延 import される（ADR-0010）。起動時にプリバンドルして
    // おくと、初回描画時の依存最適化に伴うフルリロードを避けられる。
    include: ['mermaid'],
  },
  build: {
    target: 'es2023',
    sourcemap: true,
  },
});
