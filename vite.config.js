import { sveltekit } from "@sveltejs/kit/vite";
import * as path from "path";

/** @type {import("vite").UserConfig} */
const config = {
  plugins: [sveltekit()],
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
