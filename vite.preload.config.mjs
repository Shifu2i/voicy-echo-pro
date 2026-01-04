import { defineConfig } from 'vite';

// Preload script Vite config for Electron Forge
export default defineConfig({
  build: {
    outDir: '.vite/build',
    lib: {
      entry: 'electron/preload.js',
      formats: ['cjs'],
      fileName: () => 'preload.js'
    },
    rollupOptions: {
      external: [
        'electron',
        'robotjs'
      ]
    },
    minify: false,
    sourcemap: true
  },
  resolve: {
    browserField: false,
    mainFields: ['module', 'jsnext:main', 'jsnext']
  }
});
