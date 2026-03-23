import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
  },
  resolve: {
    alias: {
      "@boxel-planner/schema": path.resolve(
        __dirname,
        "../schema/src/index.ts"
      ),
    },
  },
});
