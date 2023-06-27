import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    extensions: ['.js', '.ts'],
  },
  build: {
    outDir: 'dist', // Specify the output directory for the build
    emptyOutDir: true, // Empty the output directory before each build
  },
});
