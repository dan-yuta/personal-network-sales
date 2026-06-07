import "server-only";
import type { PageObjectResponse } from "@notionhq/client";
import { getNotionClient, NOTION_DB_IDS } from "./client";
import { notionCandidateSchema, type NotionCandidate } from "./schema";
import {
  type AxisScores,
  type Candidate,
  type PriorityKey,
  type Profile,
  type Scorecard,
  type StageKey,
} from "@/lib/schema";

/**
 * 営業候補リスト DB のデータアクセス層 (server-only)。
 *
 * Notion API v5 のデータソースモデル (Notion-Version 2025-09-03) を使う:
 *   - 読取: notion.dataSources.query({ data_source_id })
 *   - 更新: notion.pages.update({ page_id, properties })
 *
 * 流れ: Notion ページ → parseCandidatePage() → NotionCandidate(正規化) →
 *       toCandidate() → UI 用 Candidate(lib/schema)。
 *
 * "use server" のアクションラッパーは app/actions.ts に置く（この層は純データ層）。
 */

// ===== ステージ / 優先度 の日本語 ⇔ キー 変換 =====

const STAGE_JA_TO_KEY: Record<NotionCandidate["stage"], StageKey> = {
  未連絡: "screening",
  アプローチ中: "first",
  紹介進行中: "referral",
  商談中: "second",
  契約: "final",
  失注: "lost",
  保留: "held",
};
const STAGE_KEY_TO_JA: Record<StageKey, NotionCandidate["stage"]> = {
  screening: "未連絡",
  first: "アプローチ中",
  referral: "紹介進行中",
  second: "商談中",
  final: "契約",
  lost: "失注",
  held: "保留",
};
const PRIORITY_JA_TO_KEY: Record<"高" | "中" | "低", PriorityKey> = {
  高: "high",
  中: "medium",
  低: "low",
};
const PRIORITY_KEY_TO_JA: Record<PriorityKey, "高" | "中" | "低"> = {
  high: "高",
  medium: "中",
  low: "低",
};

// ===== Notion プロパティ読み取りヘルパー =====
// Notion API のプロパティ値は type による discriminated union。type を確認して
// 安全に値を取り出す。対象プロパティが無い DB（本番DBにデモ列が無い等）でも
// null/false を返すので、両 DB セットで同じ parser が動く。

type Props = PageObjectResponse["properties"];

function plainText(props: Props, name: string): string | null {
  const p = props[name];
  if (!p) return null;
  if (p.type === "rich_text") {
    return p.rich_text.map((t) => t.plain_text).join("") || null;
  }
  if (p.type === "title") {
    return p.title.map((t) => t.plain_text).join("") || null;
  }
  return null;
}
function selectName(props: Props, name: string): string | null {
  const p = props[name];
  if (!p) return null;
  if (p.type === "select") return p.select?.name ?? null;
  if (p.type === "status") return p.status?.name ?? null;
  return null;
}
function dateStart(props: Props, name: string): string | null {
  const p = props[name];
  if (p?.type === "date") return p.date?.start ?? null;
  return null;
}
function numberVal(props: Props, name: string): number | null {
  const p = props[name];
  if (p?.type === "number") return p.number ?? null;
  return null;
}
function checkboxVal(props: Props, name: string): boolean {
  const p = props[name];
  return p?.type === "checkbox" ? p.checkbox : false;
}
function emailVal(props: Props, name: string): string | null {
  const p = props[name];
  if (p?.type === "email") return p.email ?? null;
  return null;
}
function urlVal(props: Props, name: string): string | null {
  const p = props[name];
  if (p?.type === "url") return p.url ?? null;
  return null;
}
function personName(props: Props, name: string): string | null {
  const p = props[name];
  if (p?.type === "people") {
    const first = p.people[0];
    if (first && "name" in first) return first.name ?? null;
  }
  return null;
}

/** Notion ページ → 正規化 NotionCandidate（zod 検証込み）。 */
function parseCandidatePage(page: PageObjectResponse): NotionCandidate {
  const props = page.properties;
  return notionCandidateSchema.parse({
    id: page.id,
    customerName: plainText(props, "顧客名") ?? "",
    customerCompanyName: plainText(props, "顧客企業名"),
    stage: selectName(props, "進捗状況") ?? "未連絡",
    priority: selectName(props, "優先度"),
    recruiter: personName(props, "担当者"),
    furigana: plainText(props, "フリガナ"),
    birthday: dateStart(props, "生年月日"),
    source: plainText(props, "接触経路"),
    email: emailVal(props, "Email"),
    contact: plainText(props, "連絡先"),
    postalCode: plainText(props, "郵便番号"),
    address: plainText(props, "住所"),
    link: urlVal(props, "リンク"),
    backNetwork: plainText(props, "バック人脈"),
    note: plainText(props, "備考"),
    progressDetail: plainText(props, "進捗詳細"),
    nextAction: plainText(props, "次回アクション"),
    nextActionDate: dateStart(props, "次回アクション期限"),
    lastContactDate: dateStart(props, "最終連絡日"),
    desiredSalaryMin: numberVal(props, "想定取引規模Min"),
    desiredSalaryMax: numberVal(props, "想定取引規模Max"),
    axisScores: {
      achievements: numberVal(props, "関係性の強さ"),
      thinkingAbility: numberVal(props, "興味度合い"),
      communication: numberVal(props, "レスポンス速度"),
      cultureFit: numberVal(props, "紹介ポテンシャル"),
    },
    archived: checkboxVal(props, "アーカイブ"),
  });
}

/** 正規化 NotionCandidate → UI 用 Candidate(lib/schema)。 */
export function toCandidate(nc: NotionCandidate): Candidate {
  const profile: Profile = {
    name: nc.customerName,
    furigana: nc.furigana ?? "",
    birthday: nc.birthday ?? "",
    source: nc.source ?? "",
    email: nc.email ?? "",
    phone: nc.contact ?? "",
    address: nc.address ?? "",
    recruiter: nc.recruiter ?? "",
    desiredSalaryMin: nc.desiredSalaryMin != null ? String(nc.desiredSalaryMin) : "",
    desiredSalaryMax: nc.desiredSalaryMax != null ? String(nc.desiredSalaryMax) : "",
    availableStartDate: nc.nextActionDate ?? "",
    nextActionMemo: nc.nextAction ?? "",
    priority: nc.priority ? PRIORITY_JA_TO_KEY[nc.priority] : "",
    backNetwork: nc.backNetwork ?? "",
    careerText: nc.note ?? "",
    motivationFull: nc.progressDetail ?? "",
  };

  // 評価4軸（現在スナップショット）。いずれかが入っていれば 1 件の scorecard を合成。
  const hasAnyScore = Object.values(nc.axisScores).some((v) => v != null);
  const scorecards: Scorecard[] = hasAnyScore
    ? [
        {
          stage: STAGE_JA_TO_KEY[nc.stage],
          label: "現時点評価",
          date: nc.lastContactDate ?? "",
          format: "総合",
          interviewer: nc.recruiter ?? "",
          decision: "現在評価",
          axisScores: nc.axisScores,
          attachments: [],
        },
      ]
    : [];

  return {
    id: nc.id,
    profile,
    scorecards,
    stage: STAGE_JA_TO_KEY[nc.stage],
    archived: nc.archived,
  };
}

// ===== 読み取り =====

/** 全営業候補を取得（ページネーション対応）。page.tsx の初期表示に使う。 */
export async function listCandidates(): Promise<Candidate[]> {
  const notion = getNotionClient();
  const out: Candidate[] = [];
  let cursor: string | undefined = undefined;
  do {
    const res = await notion.dataSources.query({
      data_source_id: NOTION_DB_IDS.candidates(),
      start_cursor: cursor,
      page_size: 100,
    });
    for (const row of res.results) {
      if (row.object === "page" && "properties" in row) {
        out.push(toCandidate(parseCandidatePage(row)));
      }
    }
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
  } while (cursor);
  return out;
}

// ===== 書き込み =====
// pages.update の properties は SDK の型に厳密に合わせる。

type UpdateProps = NonNullable<
  Parameters<ReturnType<typeof getNotionClient>["pages"]["update"]>[0]["properties"]
>;

function rt(value: string): { rich_text: { text: { content: string } }[] } {
  return value ? { rich_text: [{ text: { content: value } }] } : { rich_text: [] };
}
function dateProp(value: string): { date: { start: string } | null } {
  return value ? { date: { start: value } } : { date: null };
}
function numProp(value: string): { number: number | null } {
  const n = value.trim() === "" ? null : Number(value);
  return { number: n != null && Number.isFinite(n) ? n : null };
}

/** 進捗ステージを更新（縦串の第一号）。 */
export async function updateCandidateStage(
  pageId: string,
  stage: StageKey,
): Promise<void> {
  const notion = getNotionClient();
  await notion.pages.update({
    page_id: pageId,
    properties: { 進捗状況: { select: { name: STAGE_KEY_TO_JA[stage] } } },
  });
}

/** アーカイブ状態を更新。 */
export async function setCandidateArchived(
  pageId: string,
  archived: boolean,
): Promise<void> {
  const notion = getNotionClient();
  await notion.pages.update({
    page_id: pageId,
    properties: { アーカイブ: { checkbox: archived } },
  });
}

/** 評価4軸（現在スナップショット）を更新。 */
export async function updateCandidateAxisScores(
  pageId: string,
  axis: AxisScores,
): Promise<void> {
  const notion = getNotionClient();
  await notion.pages.update({
    page_id: pageId,
    properties: {
      関係性の強さ: { number: axis.achievements },
      興味度合い: { number: axis.thinkingAbility },
      レスポンス速度: { number: axis.communication },
      紹介ポテンシャル: { number: axis.cultureFit },
    },
  });
}

/**
 * プロフィールの部分更新（インライン編集）。patch に含まれるキーだけ書き込む。
 * 担当者(person)・間柄/親レコード(relation) はスコープ外なので書かない。
 */
export async function updateCandidateProfile(
  pageId: string,
  patch: Partial<Profile>,
): Promise<void> {
  const notion = getNotionClient();
  const properties: UpdateProps = {};
  if (patch.name !== undefined)
    properties["顧客名"] = { title: [{ text: { content: patch.name } }] };
  if (patch.furigana !== undefined) properties["フリガナ"] = rt(patch.furigana);
  if (patch.birthday !== undefined) properties["生年月日"] = dateProp(patch.birthday);
  if (patch.source !== undefined) properties["接触経路"] = rt(patch.source);
  if (patch.email !== undefined) properties["Email"] = { email: patch.email || null };
  if (patch.phone !== undefined) properties["連絡先"] = rt(patch.phone);
  if (patch.address !== undefined) properties["住所"] = rt(patch.address);
  if (patch.desiredSalaryMin !== undefined)
    properties["想定取引規模Min"] = numProp(patch.desiredSalaryMin);
  if (patch.desiredSalaryMax !== undefined)
    properties["想定取引規模Max"] = numProp(patch.desiredSalaryMax);
  if (patch.availableStartDate !== undefined)
    properties["次回アクション期限"] = dateProp(patch.availableStartDate);
  if (patch.nextActionMemo !== undefined)
    properties["次回アクション"] = rt(patch.nextActionMemo);
  if (patch.priority !== undefined)
    properties["優先度"] = {
      select: patch.priority ? { name: PRIORITY_KEY_TO_JA[patch.priority] } : null,
    };
  if (patch.backNetwork !== undefined) properties["バック人脈"] = rt(patch.backNetwork);
  if (patch.careerText !== undefined) properties["備考"] = rt(patch.careerText);
  if (patch.motivationFull !== undefined)
    properties["進捗詳細"] = rt(patch.motivationFull);

  if (Object.keys(properties).length === 0) return;
  await notion.pages.update({ page_id: pageId, properties });
}
