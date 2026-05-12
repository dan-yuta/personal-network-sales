import "server-only";
import { Client } from "@notionhq/client";

/**
 * Notion クライアント生成 (server-only)。
 *
 * - 環境変数 `NOTION_TOKEN` を Server Action / Server Component からのみ読む。
 * - クライアントコンポーネントから直接呼ぶと build 時に `server-only` がエラーを出す。
 * - 各DB操作 (lib/notion/candidates.ts, lib/notion/contact-logs.ts) からこの client を使う。
 */
export function getNotionClient(): Client {
  const token = process.env.NOTION_TOKEN;
  if (!token) {
    throw new Error(
      "NOTION_TOKEN が未設定です。.env.local を .env.example からコピーして設定してください。",
    );
  }
  return new Client({ auth: token });
}

/**
 * 各DB の Data Source ID を環境変数から取得 (server-only)。
 *
 * Phase 2 で Notion 上に作成・接続した後、`.env.local` に貼り付ける。
 */
export const NOTION_DB_IDS = {
  candidates: () => requireEnv("NOTION_DB_CANDIDATES"),
  contactLogs: () => requireEnv("NOTION_DB_CONTACT_LOGS"),
  relationships: () => requireEnv("NOTION_DB_RELATIONSHIPS"),
} as const;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.startsWith("X")) {
    throw new Error(`${name} が未設定です (.env.local を確認してください)`);
  }
  return value;
}
