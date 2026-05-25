import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// vitest は globals: false 設定なので、@testing-library/react の自動 cleanup は
// 効かない (jest 環境のみ自動)。テスト間で DOM が残らないよう手動で cleanup を
// afterEach する。これがないと「multiple elements found」エラーが頻発する。
afterEach(() => {
  cleanup();
});
