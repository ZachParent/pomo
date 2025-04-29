import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import path from "path";
import { fileURLToPath } from "url"; // Import the helper

// Get the directory name using import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const base = process.env.NODE_ENV === "production" ? "/pomo" : "/";

// https://vitejs.dev/config/
export default defineConfig({
  base: base, // Explicitly set Vite's base path
  plugins: [svelte()],
  // Add SASS preprocessor options
  css: {
    preprocessorOptions: {
      scss: {
        // Revert loadPaths back to the main node_modules directory
        loadPaths: [path.resolve(__dirname, "node_modules")],
      },
    },
  },
});
