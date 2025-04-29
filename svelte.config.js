import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import adapter from "@sveltejs/adapter-static";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://svelte.dev/docs#compile-time-svelte-preprocess
  // for more information about preprocessors
  preprocess: vitePreprocess(),

  kit: {
    adapter: adapter({
      // default options are generally fine for GitHub Pages
      pages: "build", // output directory
      assets: "build", // output directory
      fallback: undefined, // Use undefined for default fallback (404.html)
      precompress: false,
      strict: true,
    }),
    paths: {
      base: process.env.NODE_ENV === "production" ? "/pomo" : "", // Set base path for production builds
    },
  },
};

export default config;
