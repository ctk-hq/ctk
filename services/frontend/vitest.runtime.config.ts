import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["tests/runtime/**/*.test.ts"],
    environment: "node",
    hookTimeout: 300_000,
    testTimeout: 120_000,
    fileParallelism: false
  }
});
