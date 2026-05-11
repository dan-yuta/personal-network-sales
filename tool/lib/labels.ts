/**
 * 雛形の表示文言（labels）。
 *
 * 業種を変える受講生は、このファイルの値を業種に合わせて書き換える。
 * 例: 学校なら EVALUATION_AXIS を「学力 / 思考力 / 表現力 / 主体性」に、
 *     STAGE_LABELS を「見学 / 体験授業 / 面接 / 契約」に変更する。
 *
 * 後フェーズの予定:
 *   - Phase C: 評価観点と選考ステージを Tagged Union 化したデータ駆動に
 *   - 現時点では key → 日本語ラベルの単純なマッピングとして持つ
 */

import { type AxisKey, type StageKey } from "@/lib/schema";

// ===== 評価観点（4 軸固定、ADR-0005 §13 / design.md D57） =====
// この雛形は 実績 / 思考力 / コミュニケーション / カルチャーフィット の 4 軸を採用する

// 営業候補の評価観点（4軸固定）。
// 採用管理時代の「実績 / 思考力 / コミュニケーション / カルチャーフィット」を、
// 営業向けの「関係性の強さ / 興味度合い / レスポンス速度 / 紹介ポテンシャル」に
// 読み替え。zod スキーマの key 自体は維持（後の vault フェーズで rename 予定）。
export const EVALUATION_AXIS: Record<AxisKey, string> = {
  achievements: "関係性の強さ",
  thinkingAbility: "興味度合い",
  communication: "レスポンス速度",
  cultureFit: "紹介ポテンシャル",
} as const;

// Pane 2 のグループ見出しに出すステージ表示名（日本語）。
// `Scorecard.label` とは独立に持つ（候補者ごとの個別ラベルではなく、
// 列としてのステージ名なので Record で固定）。
//
// 営業候補リスト用に書き換え（採用管理 → 営業フェーズ）。
// 既存 zod スキーマの key (screening/first/second/final) はそのままで、
// 表示ラベルだけ「未連絡 / アプローチ中 / 商談中 / 契約」に差し替えている。
// 失注・保留はサブステージとして扱う想定だが、最小修正フェーズでは
// アーカイブ機能で代替する。
export const STAGE_LABELS: Record<StageKey, string> = {
  screening: "未連絡",
  first: "アプローチ中",
  second: "商談中",
  final: "契約",
};

// Pane 2 末尾の「アーカイブ済み」グループの見出しラベル。
// archived === true の候補者を束ねる仮想グループで、ステージとは直交した概念。
export const ARCHIVED_GROUP_LABEL = "アーカイブ済み";

// ===== Pane 3 ダッシュボードのセクション見出し（ADR-0014） =====

// 営業候補向けに読み替え（雛形の Pane 3 セクション見出し）。
// 採用ドメインの語彙（応募情報・採用条件・選考フロー）を
// 営業ドメイン（候補者情報・営業条件・接触フロー）に置換。
export const PANE3_SECTION = {
  applicationInfo: "候補者情報",
  recruitingConditions: "営業条件",
  screeningFlow: "接触フロー",
  screeningFlowDescription: "進捗と接触メモ",
} as const;

// ===== Pane 4 セクション id（ADR-0015 §19 でモード 1 廃止、m2 のみ） =====

export const PANE4_SECTION_IDS = {
  m2: {
    info: "pane4-m2-info",
    evaluation: "pane4-m2-evaluation",
    comment: "pane4-m2-comment",
    summary: "pane4-m2-summary",
    attachments: "pane4-m2-attachments",
  },
} as const;
