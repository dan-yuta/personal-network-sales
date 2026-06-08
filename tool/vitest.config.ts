import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./__tests__/setup.ts"],
    include: ["__tests__/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // サーバ専用モジュール内の純ロジックを jsdom 環境でテストするためのスタブ。
      "server-only": path.resolve(__dirname, "__tests__/server-only-stub.ts"),
    },
  },
});
