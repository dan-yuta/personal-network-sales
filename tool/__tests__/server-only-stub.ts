// vitest(jsdom) 用の "server-only" スタブ。
// 本物の server-only は browser バンドルで import されると throw する。
// 単体テストではサーバ専用モジュール内の純ロジック(toCandidate 等)を検証したいので、
// vitest.config.ts の alias で "server-only" をこの空モジュールに差し替える。
export {};
