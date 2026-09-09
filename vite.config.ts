import { defineConfig } from 'vite';

export default defineConfig({
  root: 'poc',
  base: './',
  build: { outDir: '../dist-poc', emptyOutDir: true },
});
