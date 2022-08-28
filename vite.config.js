import { sveltekit } from "@sveltejs/kit/vite";
import * as path from "path";

/** @type {import("vite").UserConfig} */
const config = {
  plugins: [sveltekit()],
  optimizeDeps: {
    include: ["dayjs/plugin/relativeTime.js"],
  },
  server: {
    fs: {
      allow: [".."]
    }
  },
  resolve: {
    alias: {
      $i18n: path.resolve('./src/i18n'),
      $components: path.resolve('./src/components'),
    },
  },
};

export default config;
