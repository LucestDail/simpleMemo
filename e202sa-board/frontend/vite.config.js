import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  root: __dirname,
  build: {
    outDir: path.resolve(__dirname, '../dist'),
    emptyOutDir: true,
  },
  server: {
    host: '0.0.0.0',
    port: 19090,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://127.0.0.1:19091', changeOrigin: true },
      '/socket.io': { target: 'http://127.0.0.1:19091', ws: true },
    },
  },
});
