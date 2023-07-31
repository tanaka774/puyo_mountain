import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    extensions: ['.js', '.ts'],
  },
  build: {
    outDir: 'dist', // Specify the output directory for the build
    emptyOutDir: true, // Empty the output directory before each build
  },
  assetsInclude: ['/src/fonts/*.woff2'],
  alias: {
    "@fonts": ["/src/fonts"],
    "@": ["/src"],
  },
  types: ["vite/client"],
  define: {
    __APP_ENV__: process.env.VITE_TEST_KEY,
  },
});
