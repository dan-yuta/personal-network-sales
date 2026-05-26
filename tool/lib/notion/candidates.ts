import "server-only";
import { getNotionClient, NOTION_DB_IDS } from "./client";
import type { NotionCandidate } from "./schema";

/**
 * 営業候補リスト DB の Server Action 関数群。
 *
 * - Server Component / Server Action からのみ呼ばれる (server-only)。
 * - クライアント側は `useCandidates` フックなどから Server Action 経由で呼ぶ。
 *
 * 現フェーズは「ひな形」のみ。Phase 2 で Notion 接続が完了したら、
 * 各関数の中身を実装する (TODO コメント参照)。
 */

/**
 * 全営業候補を取得。Pane2 / Pane1 のステージタブ件数表示に使う。
 *
 * TODO: 実装
 *   const notion = getNotionClient();
 *   const response = await notion.databases.query({
 *     database_id: NOTION_DB_IDS.candidates(),
 *     page_size: 100,
 *   });
 *   return response.results.map(parseCandidate);
 */
export async function listCandidates(): Promise<NotionCandidate[]> {
  // Phase 3 で実装。現フェーズはモックデータを Pane2 が直接持っている。
  void getNotionClient;
  void NOTION_DB_IDS;
  throw new Error(
    "listCandidates is not implemented yet. Phase 3 で Notion 接続後に実装してください。",
  );
}

/**
 * 候補者を1名取得。Pane3 候補者ダッシュボードで使う。
 *
 * TODO: 実装
 *   const notion = getNotionClient();
 *   const response = await notion.pages.retrieve({ page_id: id });
 *   return parseCandidate(response);
 */
export async function getCandidate(id: string): Promise<NotionCandidate> {
  void id;
  throw new Error(
    "getCandidate is not implemented yet. Phase 3 で Notion 接続後に実装してください。",
  );
}

/**
 * 候補者の特定プロパティを更新 (インライン編集用)。
 * 楽観的更新前提なので、UI 側でロールバックできるように Promise を返す。
 *
 * TODO: 実装
 *   const notion = getNotionClient();
 *   await notion.pages.update({
 *     page_id: id,
 *     properties: { ... }, // patch から Notion API プロパティ形式に変換
 *   });
 */
export async function updateCandidate(
  id: string,
  patch: Partial<NotionCandidate>,
): Promise<void> {
  void id;
  void patch;
  throw new Error(
    "updateCandidate is not implemented yet. Phase 3 で Notion 接続後に実装してください。",
  );
}
