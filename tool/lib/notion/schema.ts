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
 *
 * 2 つの DB セットに対応する（grill 決定）:
 *   - 本番DB(ローカル): 実在する 19 列のみ。フリガナ/生年月日/想定取引規模/評価4軸/
 *     アーカイブ列は「無い」ため、normalizer が null/false を返す。
 *   - デモDB(公開): 上記＋追加列まで自作。全項目が往復ロスレス。
 * そのため追加列は nullable / default を付け、どちらの DB でも safeParse が通る。
 *
 * 注意（実DB確認で判明）:
 *   - 進捗状況 select は 7 択（紹介進行中 を含む）。lib/schema.ts の StageKey と一致。
 *   - 顧客名 が title、顧客企業名 が text（旧コメントは取り違えていたので修正）。
 *   - 担当者(person)・親レコード/間柄(relation) は今回スコープ外（読み取りのみ・書かない）。
 */
export const notionCandidateSchema = z.object({
  id: z.string(), // Notion ページID
  customerName: z.string(), // 顧客名 (title) → profile.name
  customerCompanyName: z.string().nullable(), // 顧客企業名 (text)
  stage: z.enum([
    "未連絡",
    "アプローチ中",
    "紹介進行中",
    "商談中",
    "契約",
    "失注",
    "保留",
  ]),
  priority: z.enum(["高", "中", "低"]).nullable(),
  recruiter: z.string().nullable(), // 担当者: デモDBは text、本番は person→null
  furigana: z.string().nullable(), // デモDBのみ
  birthday: z.string().nullable(), // ISO date、デモDBのみ
  source: z.string().nullable(), // 接触経路: デモDBは text 列。実DBは間柄(relation)=スコープ外→null
  email: z.string().nullable(),
  contact: z.string().nullable(), // 連絡先 (LINE ID 等)
  postalCode: z.string().nullable(),
  address: z.string().nullable(),
  link: z.string().nullable(),
  backNetwork: z.string().nullable(), // バック人脈
  note: z.string().nullable(), // 備考 → profile.careerText
  progressDetail: z.string().nullable(), // 進捗詳細 → profile.motivationFull
  nextAction: z.string().nullable(), // 次回アクション → profile.nextActionMemo
  nextActionDate: z.string().nullable(), // 次回アクション期限 → profile.availableStartDate (ISO date)
  lastContactDate: z.string().nullable(), // 最終連絡日 (ISO date、接触ログから自動同期)
  desiredSalaryMin: z.number().nullable(), // 想定取引規模Min、デモDBのみ
  desiredSalaryMax: z.number().nullable(), // 想定取引規模Max、デモDBのみ
  // 評価4軸（現在スナップショット）。デモDBは number 列、本番DBは列なし→null。
  axisScores: z
    .object({
      achievements: z.number().nullable(), // 関係性の強さ
      thinkingAbility: z.number().nullable(), // 興味度合い
      communication: z.number().nullable(), // レスポンス速度
      cultureFit: z.number().nullable(), // 紹介ポテンシャル
    })
    .default({
      achievements: null,
      thinkingAbility: null,
      communication: null,
      cultureFit: null,
    }),
  archived: z.boolean().default(false), // アーカイブ: デモDBは checkbox、本番は列なし→false
  parentRecordIds: z.array(z.string()).default([]), // 親レコード（読み取りのみ・スコープ外）
  relationshipIds: z.array(z.string()).default([]), // 間柄（読み取りのみ・スコープ外）
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
