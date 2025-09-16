import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';

// https://vitejs.dev/config/
export default defineConfig({
  
  plugins: [react()],
  define: {
    // @ts-ignore
    global: {},
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['aws-sdk'],
    esbuildOptions: {
      plugins: [
        NodeGlobalsPolyfillPlugin({
          process: true,
          buffer: true,
          }),
      ],
    }
  },
  test: {
    environment: 'jsdom',
    setupFiles: 'src/test/setup.ts',
    css: true,
    globals: true,
    coverage: {
      provider: 'v8',
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
