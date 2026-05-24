/**
 * 人脈営業ツールの表示文言（labels）。
 *
 * Phase 1（現フェーズ）では key → 日本語ラベルの単純なマッピングとして持つ。
 * 後フェーズで評価観点・ステージを Tagged Union 化したデータ駆動に切り替える予定。
 */

import { type AxisKey, type StageKey } from "@/lib/schema";

// ===== 評価観点（4 軸固定） =====

// 営業候補の評価観点（4軸固定）。
// 雛形由来の「実績 / 思考力 / コミュニケーション / カルチャーフィット」を、
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
// 営業候補リスト向けの表示ラベル。
// zod スキーマで stageKey は 6 種類 (メイン4 + サブ2) として定義されており、
// それぞれの日本語表示ラベルをここでマッピングする。
// メイン: 未連絡 → アプローチ中 → 商談中 → 契約 の標準フロー。
// サブ: 失注 (成約しなかった) / 保留 (いったん中断、再開可能性あり)。
export const STAGE_LABELS: Record<StageKey, string> = {
  screening: "未連絡",
  first: "アプローチ中",
  second: "商談中",
  final: "契約",
  lost: "失注",
  held: "保留",
};

// Pane 2 末尾の「アーカイブ済み」グループの見出しラベル。
// archived === true の候補者を束ねる仮想グループで、ステージとは直交した概念。
export const ARCHIVED_GROUP_LABEL = "アーカイブ済み";

// ===== Pane 3 ダッシュボードのセクション見出し =====

// 営業候補向けの Pane 3 セクション見出し。
// 雛形由来の語彙（応募情報・採用条件・選考フロー）を
// 営業ドメイン（候補者情報・営業条件・接触フロー）に読み替えている。
export const PANE3_SECTION = {
  applicationInfo: "候補者情報",
  recruitingConditions: "営業条件",
  screeningFlow: "接触フロー",
  screeningFlowDescription: "進捗と接触メモ",
} as const;

// ===== Pane 4 セクション id =====

export const PANE4_SECTION_IDS = {
  m2: {
    info: "pane4-m2-info",
    evaluation: "pane4-m2-evaluation",
    comment: "pane4-m2-comment",
    summary: "pane4-m2-summary",
    attachments: "pane4-m2-attachments",
  },
} as const;
