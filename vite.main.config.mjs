import { defineConfig } from 'vite';

// Main process Vite config for Electron Forge
export default defineConfig({
  build: {
    outDir: '.vite/build',
    lib: {
      entry: 'electron/main.js',
      formats: ['cjs'],
      fileName: () => 'main.js'
    },
    rollupOptions: {
      external: [
        'electron',
        'robotjs',
        'path',
        'fs',
        'os',
        'url'
      ]
    },
    minify: false,
    sourcemap: true
  },
  resolve: {
    // Ensure Node.js built-ins are treated as external
    browserField: false,
    mainFields: ['module', 'jsnext:main', 'jsnext']
  }
});
