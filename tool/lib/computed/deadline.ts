/**
 * 「次回アクション日」の期限警告バッジ計算ヘルパー。
 *
 * `profile.availableStartDate` (YYYY-MM-DD 文字列) を今日と比較して、
 * 営業ツールとして「目立たせる/普通に表示する」を判定する。
 *
 *   - 過去日: "期限超過" (rose、最強警告)
 *   - 今日: "今日"   (rose)
 *   - 明日: "明日"   (rose)
 *   - 2〜3 日後: "あと N 日" (amber、注意喚起)
 *   - それ以降: "M/D" (デフォルト色、通常表示)
 *
 * UI は Pane 2 候補者行と Pane 3 営業条件カードで使う。
 *
 * タイムゾーン対応: `parseISODate` (lib/computed/profile.ts) を使い、
 * `"2026-05-25"` のような ISO date-only を **ローカルタイム 0 時**として
 * パースする。素朴な `new Date("2026-05-25")` は UTC 0 時パースで、
 * UTC-X 圏 (米西海岸 UTC-8 等) のブラウザで「1 日早い」警告が出る不具合
 * を回避。
 */

import { parseISODate, todayPartsJST } from "./profile";

export type DeadlineBadge = {
  /** 表示文字列 (例: "今日" / "あと3日" / "6/10" / "期限超過") */
  text: string;
  /** Tailwind カラークラス */
  className: string;
  /** 緊急度 (高=赤、中=黄、低=通常)。並び替え等で使いたい場合用 */
  level: "high" | "medium" | "low";
};

/**
 * YYYY-MM-DD 形式の日付文字列から期限バッジ情報を返す。
 * 空文字列・無効な日付なら null を返す (= 表示しない)。
 *
 * 日数差は年月日成分のみで計算 (Date.UTC) し、夏時間境界 (米欧の DST) の
 * 23h/25h 日が混じっても安定。
 */
export function getDeadlineBadge(date: string): DeadlineBadge | null {
  const target = parseISODate(date);
  if (!target) return null;

  // 「今日」は常に日本時間（Asia/Tokyo）で判定する。SSR（UTC）とクライアント
  // （JST）で暦日がズレて「明日↔今日」がちらつくのを防ぐ。年月日成分のみを
  // UTC 化して diff を取る（DST 安全）。
  const t = todayPartsJST();
  const targetUtc = Date.UTC(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
  );
  const todayUtc = Date.UTC(t.year, t.month - 1, t.day);
  const diffDays = Math.round((targetUtc - todayUtc) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      text: "期限超過",
      className: "bg-rose-100 text-rose-700",
      level: "high",
    };
  }
  if (diffDays === 0) {
    return {
      text: "今日",
      className: "bg-rose-100 text-rose-700",
      level: "high",
    };
  }
  if (diffDays === 1) {
    return {
      text: "明日",
      className: "bg-rose-100 text-rose-700",
      level: "high",
    };
  }
  if (diffDays <= 3) {
    return {
      text: `あと${diffDays}日`,
      className: "bg-amber-100 text-amber-700",
      level: "medium",
    };
  }
  const m = target.getMonth() + 1;
  const d = target.getDate();
  return {
    text: `${m}/${d}`,
    className: "text-muted-foreground",
    level: "low",
  };
}
