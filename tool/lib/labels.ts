/**
 * 人脈営業ツールの表示文言（labels）。
 *
 * Phase 1（現フェーズ）では key → 日本語ラベルの単純なマッピングとして持つ。
 * 後フェーズで評価観点・ステージを Tagged Union 化したデータ駆動に切り替える予定。
 */

import { type AxisKey, type PriorityKey, type StageKey } from "@/lib/schema";

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
// zod スキーマで stageKey は 7 種類 (メイン5 + サブ2) として定義されており、
// それぞれの日本語表示ラベルをここでマッピングする。
// メイン: 未連絡 → アプローチ中 → 紹介進行中 → 商談中 → 契約 の標準フロー。
// サブ: 失注 (成約しなかった) / 保留 (いったん中断、再開可能性あり)。
export const STAGE_LABELS: Record<StageKey, string> = {
  screening: "未連絡",
  first: "アプローチ中",
  referral: "紹介進行中",
  second: "商談中",
  final: "契約",
  lost: "失注",
  held: "保留",
};

// Pane 2 末尾の「アーカイブ済み」グループの見出しラベル。
// archived === true の候補者を束ねる仮想グループで、ステージとは直交した概念。
export const ARCHIVED_GROUP_LABEL = "アーカイブ済み";

// ===== 優先度ラベルとテーマ =====

/** 優先度キー → 日本語表示ラベル */
export const PRIORITY_LABELS: Record<PriorityKey, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

/**
 * 優先度の選択基準。Pane3 で「何を基準で選べばよいか」を可視化するため、
 * 各ボタンの title 属性 + Pane3 ヘルプテキストに使う。
 * フォロー密度ベースの目安 (営業実務で運用しやすい単純なルール) に統一。
 */
export const PRIORITY_DESCRIPTIONS: Record<PriorityKey, string> = {
  high: "直近 2 週間以内に動かす",
  medium: "月に 1〜2 回フォロー",
  low: "月 1 回以下、長期視点で維持",
};

/** 優先度ごとの配色 (Pane2 マーカー / Pane3 セレクトで共通) */
export const PRIORITY_THEME: Record<
  PriorityKey,
  {
    /** マーカーや active 背景: bg + text + border */
    activeClass: string;
    /** Pane2 ドット用 (text-color のみ、bg-current で塗る) */
    dotClass: string;
  }
> = {
  high: {
    activeClass: "border-rose-300 bg-rose-100 text-rose-700",
    dotClass: "text-rose-500",
  },
  medium: {
    activeClass: "border-amber-300 bg-amber-100 text-amber-700",
    dotClass: "text-amber-500",
  },
  low: {
    activeClass: "border-slate-300 bg-slate-100 text-slate-600",
    dotClass: "text-slate-400",
  },
};

// ===== ステージ別テーマカラー =====

/**
 * ステージごとの Tailwind カラークラス集約。
 * Pane1 のアクセントバー、Pane2 グループ見出しのバッジ、Pane3 のヘッダー等で
 * 同じテーマカラーを使ってステージを視覚的に識別できるようにする。
 * 提出図解 (submission/tool-overview.html) のカラーパレットとも揃えている。
 */
export const STAGE_THEME: Record<
  StageKey,
  {
    /** バッジや薄い背景に使う色 (bg-XXX-100/200 系) */
    bg: string;
    /** バッジ等のテキスト色 (text-XXX-700/800 系、コントラスト確保) */
    text: string;
    /** Pane1 タブの左ボーダーアクセント色 (border-l-XXX-500 系) */
    leftBar: string;
    /** ドットマーカー等の単色 (text-XXX-500 系) */
    dot: string;
  }
> = {
  screening: {
    bg: "bg-slate-100",
    text: "text-slate-700",
    leftBar: "border-l-slate-400",
    dot: "text-slate-400",
  },
  first: {
    bg: "bg-amber-100",
    text: "text-amber-800",
    leftBar: "border-l-amber-500",
    dot: "text-amber-500",
  },
  // referral (紹介進行中) は blue 系。Notion 進捗状況 select の blue と揃え、
  // アプローチ中 (amber) と商談中 (orange) の暖色フローの中で寒色アクセントとして
  // 「紹介が動いている」段階を識別しやすくする。
  referral: {
    bg: "bg-blue-100",
    text: "text-blue-800",
    leftBar: "border-l-blue-500",
    dot: "text-blue-500",
  },
  // second (商談中) を orange-200 / orange-900 に一段濃く。
  // amber-100 (アプローチ中) との色相差 14度 + 明度差 2.8% の判別困難
  // 問題を改善 (UI/UX レビュー指摘 B3)。
  second: {
    bg: "bg-orange-200",
    text: "text-orange-900",
    leftBar: "border-l-orange-600",
    dot: "text-orange-600",
  },
  final: {
    bg: "bg-emerald-100",
    text: "text-emerald-800",
    leftBar: "border-l-emerald-500",
    dot: "text-emerald-500",
  },
  lost: {
    bg: "bg-rose-100",
    text: "text-rose-800",
    leftBar: "border-l-rose-500",
    dot: "text-rose-500",
  },
  // held (保留) を slate-50 ベースに薄める。
  // screening (slate-100) と区別が弱かった問題を改善、「ペンディング感」を
  // 文字色も含めて薄く表現。
  held: {
    bg: "bg-slate-50",
    text: "text-slate-500",
    leftBar: "border-l-slate-300",
    dot: "text-slate-300",
  },
};

// ===== 接触ログ手段の色マッピング =====

/**
 * 接触ログの「手段」(電話・メール・LINE・訪問・オンライン会議・SNS・その他)
 * ごとに表示する Tailwind カラークラス。
 * Pane4 接触ログ一覧で手段バッジを色分けして一目で識別できるようにする。
 */
export const CONTACT_METHOD_THEME: Record<string, { bg: string; text: string }> =
  {
    電話: { bg: "bg-blue-100", text: "text-blue-700" },
    メール: { bg: "bg-emerald-100", text: "text-emerald-700" },
    LINE: { bg: "bg-green-100", text: "text-green-700" },
    訪問: { bg: "bg-orange-100", text: "text-orange-700" },
    オンライン会議: { bg: "bg-violet-100", text: "text-violet-700" },
    SNS: { bg: "bg-pink-100", text: "text-pink-700" },
    その他: { bg: "bg-slate-100", text: "text-slate-700" },
  };

/** デフォルト値 (未知の手段の場合のフォールバック) */
export const CONTACT_METHOD_THEME_DEFAULT = {
  bg: "bg-slate-100",
  text: "text-slate-700",
};

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
