import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    extensions: ['.js', '.ts'],
  },
  build: {
    outDir: 'public',
    emptyOutDir: true,
  },
  assetsInclude: ['/src/fonts/*.woff2'],
  alias: {
    "@fonts": ["/src/fonts"],
    "@": ["/src"],
  },
  types: ["vite/client"],
  define: {
  },
});
