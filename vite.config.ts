import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import path from 'path'
import { fileURLToPath } from 'url'; // Import the helper

// Get the directory name using import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte()],
  // Add SASS preprocessor options
  css: {
    preprocessorOptions: {
      scss: {
        // Use path.resolve with the correctly derived __dirname
        includePaths: [path.resolve(__dirname, 'node_modules')],
        // Optionally include global SASS variables/mixins here
        // additionalData: `@import './src/variables.scss';`
      },
    },
  },
})
