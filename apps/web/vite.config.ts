import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  define: {
    __BUILD_TIMESTAMP__: JSON.stringify(Date.now().toString()),
  },
  resolve: {
    extensions: [".svelte.ts", ".mjs", ".js", ".mts", ".ts", ".jsx", ".tsx", ".json"],
  },
});
