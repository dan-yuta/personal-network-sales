import { z } from "zod";

/**
 * Notion DB から取得したプロパティを安全にパースするための zod スキーマ。
 *
 * 設計の出典:
 *   - docs/03_データ設計書.md の「既存『営業候補リスト』DB のスキーマ詳細」
 *   - docs/03_データ設計書.md の「新規『接触ログ』DB のスキーマ」
 *
 * 実装方針:
 *   - Notion API のレスポンスは複雑な discriminated union 構造を持つため、
 *     上位レイヤで正規化された型 (NotionCandidate / NotionContactLog) に変換する。
 *   - 変換ロジックは lib/notion/candidates.ts / lib/notion/contact-logs.ts に置く。
 */

// ===== 営業候補リスト DB =====

/**
 * Notion DB「営業候補リスト」の正規化された型。
 * Notion 側の生プロパティを Server Action 内でこの型に変換してから UI に渡す。
 */
export const notionCandidateSchema = z.object({
  id: z.string(), // Notion ページID
  customerCompanyName: z.string(), // 顧客企業名 (title)
  customerName: z.string(), // 顧客名 (text)
  stage: z.enum(["未連絡", "アプローチ中", "商談中", "契約", "失注", "保留"]),
  priority: z.enum(["高", "中", "低"]).nullable(),
  email: z.string().nullable(),
  contact: z.string().nullable(), // 連絡先 (LINE ID 等)
  postalCode: z.string().nullable(),
  address: z.string().nullable(),
  link: z.string().nullable(),
  backNetwork: z.string().nullable(), // バック人脈
  note: z.string().nullable(), // 備考
  progressDetail: z.string().nullable(), // 進捗詳細
  nextAction: z.string().nullable(),
  nextActionDate: z.string().nullable(), // ISO date
  lastContactDate: z.string().nullable(), // ISO date
  parentRecordIds: z.array(z.string()), // 親レコードのページIDリスト (紹介元)
  relationshipIds: z.array(z.string()), // 間柄DB の関連ページID
});
export type NotionCandidate = z.infer<typeof notionCandidateSchema>;

// ===== 接触ログ DB =====

/**
 * 接触ログ DB の手段選択肢。Phase 2 で Notion 側 Select オプションと一致させる。
 */
export const contactMethodSchema = z.enum([
  "電話",
  "メール",
  "LINE",
  "訪問",
  "オンライン会議",
  "SNS",
  "その他",
]);
export type ContactMethod = z.infer<typeof contactMethodSchema>;

/**
 * Notion DB「接触ログ」の正規化された型。
 */
export const notionContactLogSchema = z.object({
  id: z.string(),
  title: z.string(), // 件名 ("YYYY-MM-DD HH:mm 手段" を想定)
  date: z.string(), // ISO date
  method: contactMethodSchema,
  content: z.string(),
  candidateId: z.string(), // 関連する候補者のページID (relation)
});
export type NotionContactLog = z.infer<typeof notionContactLogSchema>;
