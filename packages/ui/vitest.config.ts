/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "jsdom", setupFiles: ["./src/test-setup.ts"], css: false, include: ["src/**/*.test.{ts,tsx}"], testTimeout: 15000 },
});
