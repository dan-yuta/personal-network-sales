import "server-only";
import type { PageObjectResponse } from "@notionhq/client";
import { getNotionClient, NOTION_DB_IDS } from "./client";
import {
  contactMethodSchema,
  notionContactLogSchema,
  type ContactMethod,
  type NotionContactLog,
} from "./schema";
import { dateStart, plainText, relationIds, selectName } from "./props";

/**
 * 接触ログ DB のデータアクセス層 (server-only)。
 *
 * 同期規約 (docs/03_データ設計書.md):
 *   - 新規追加時: 接触ログDB に作成 + 営業候補リストDB の「最終連絡日」を自動上書き
 *   - フォームで「次回アクション」も入力された場合: 営業候補レコードに上書き
 *
 * "use server" ラッパーは app/actions.ts に置く（この層は純データ層）。
 */

type NotionClient = ReturnType<typeof getNotionClient>;
type QueryParams = Parameters<NotionClient["dataSources"]["query"]>[0];

function parseLogPage(page: PageObjectResponse): NotionContactLog {
  const props = page.properties;
  return notionContactLogSchema.parse({
    id: page.id,
    title: plainText(props, "件名") ?? "",
    date: dateStart(props, "日付") ?? "",
    method: selectName(props, "手段") ?? "その他",
    content: plainText(props, "内容") ?? "",
    candidateId: relationIds(props, "候補者")[0] ?? "",
  });
}

/** 候補者の接触ログを新→旧で取得。Pane4 タブA の履歴表示に使う。 */
export async function listContactLogsForCandidate(
  candidateId: string,
): Promise<NotionContactLog[]> {
  const notion = getNotionClient();
  const query: QueryParams = {
    data_source_id: NOTION_DB_IDS.contactLogs(),
    filter: { property: "候補者", relation: { contains: candidateId } },
    sorts: [{ property: "日付", direction: "descending" }],
    page_size: 100,
  };
  const res = await notion.dataSources.query(query);
  const logs: NotionContactLog[] = [];
  for (const row of res.results) {
    if (row.object === "page" && "properties" in row) {
      logs.push(parseLogPage(row));
    }
  }
  return logs;
}

/**
 * 接触ログを新規追加し、関連する営業候補リストの「最終連絡日」を自動更新。
 *   1. 接触ログDB に新規ページ作成
 *   2. 候補者の「最終連絡日」を今回の日付で上書き（denormalized 同期）
 *   3. フォームで次回アクションも入力されていれば候補者に上書き
 */
export async function addContactLog(params: {
  candidateId: string;
  date: string;
  method: ContactMethod;
  content: string;
  nextAction?: string;
  nextActionDate?: string;
}): Promise<void> {
  const notion = getNotionClient();
  const method = contactMethodSchema.parse(params.method);
  const title = `${params.date} ${method}`;

  // Step 1: 接触ログを作成
  await notion.pages.create({
    parent: {
      type: "data_source_id",
      data_source_id: NOTION_DB_IDS.contactLogs(),
    },
    properties: {
      件名: { title: [{ text: { content: title } }] },
      日付: { date: { start: params.date } },
      手段: { select: { name: method } },
      内容: params.content
        ? { rich_text: [{ text: { content: params.content } }] }
        : { rich_text: [] },
      候補者: { relation: [{ id: params.candidateId }] },
    },
  });

  // Step 2-3: 候補者の最終連絡日（＋任意で次回アクション）を更新
  type UpdateProps = NonNullable<
    Parameters<NotionClient["pages"]["update"]>[0]["properties"]
  >;
  const candidateProps: UpdateProps = {
    最終連絡日: { date: { start: params.date } },
  };
  if (params.nextAction !== undefined) {
    candidateProps["次回アクション"] = params.nextAction
      ? { rich_text: [{ text: { content: params.nextAction } }] }
      : { rich_text: [] };
  }
  if (params.nextActionDate !== undefined) {
    candidateProps["次回アクション期限"] = params.nextActionDate
      ? { date: { start: params.nextActionDate } }
      : { date: null };
  }
  await notion.pages.update({
    page_id: params.candidateId,
    properties: candidateProps,
  });
}
