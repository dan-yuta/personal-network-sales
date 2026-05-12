import "server-only";
import { getNotionClient, NOTION_DB_IDS } from "./client";
import type { ContactMethod, NotionContactLog } from "./schema";

/**
 * 接触ログ DB の Server Action 関数群。
 *
 * 同期規約 (docs/03_データ設計書.md):
 *   - 新規追加時: 接触ログDB に作成 + 営業候補リストDB の「最終連絡日」を自動上書き
 *   - フォームで「次回アクション」も入力された場合: 営業候補レコードに手動上書き
 *   - 連絡文タブBで「接触ログとして保存」: 同様に接触ログDB+営業候補リストDB を更新
 */

/**
 * 候補者の接触ログを取得 (新→旧で並び替え)。Pane4 タブA の履歴表示に使う。
 *
 * TODO: 実装
 *   const notion = getNotionClient();
 *   const response = await notion.databases.query({
 *     database_id: NOTION_DB_IDS.contactLogs(),
 *     filter: { property: "候補者", relation: { contains: candidateId } },
 *     sorts: [{ property: "日付", direction: "descending" }],
 *   });
 *   return response.results.map(parseContactLog);
 */
export async function listContactLogsForCandidate(
  candidateId: string,
): Promise<NotionContactLog[]> {
  void candidateId;
  void getNotionClient;
  void NOTION_DB_IDS;
  throw new Error(
    "listContactLogsForCandidate is not implemented yet. Phase 3 で Notion 接続後に実装してください。",
  );
}

/**
 * 接触ログを新規追加し、関連する営業候補リストの「最終連絡日」を自動更新。
 *
 * 楽観更新の流れ (docs/02_UI設計書.md):
 *   1. UI 側で即座に履歴リストへ追加 (useOptimistic)
 *   2. この Server Action 呼び出し (バックグラウンド)
 *   3. 成功: revalidate / 失敗: クライアント側でロールバック + トースト
 *
 * TODO: 実装
 *   const notion = getNotionClient();
 *   // Step 1: 接触ログDB に新規ページ作成
 *   await notion.pages.create({ parent: { database_id: NOTION_DB_IDS.contactLogs() }, properties: { ... } });
 *   // Step 2: 営業候補リストDB の「最終連絡日」を更新
 *   await notion.pages.update({ page_id: candidateId, properties: { 最終連絡日: { date: { start: date } } } });
 *   // Step 3: フォームで次回アクションも入力されていれば一緒に更新
 *   if (nextAction) { ... }
 */
export async function addContactLog(params: {
  candidateId: string;
  date: string;
  method: ContactMethod;
  content: string;
  nextAction?: string;
  nextActionDate?: string;
}): Promise<void> {
  void params;
  throw new Error(
    "addContactLog is not implemented yet. Phase 3 で Notion 接続後に実装してください。",
  );
}
