import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

// Renderer (React app) Vite config for Electron Forge
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    outDir: '.vite/renderer/main_window',
    emptyOutDir: true,
    sourcemap: true
  },
  // Base path for loading assets in packaged app
  base: './'
});
