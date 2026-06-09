/**
 * 「最終接触からの経過日数」相対表記ヘルパー。
 *
 * Notion 由来の `Candidate.lastContactDate`（接触ログ追加時に denormalized 同期）の
 * YYYY-MM-DD 文字列を今日と比較し、人間が「やばさ」を直感で判別できる
 * 相対表記に変換する。営業ツールとして「12 日前 / 3 週間前 / 半年前」と
 * 表示することで、引き算を脳でしなくて済む。
 *
 *   - 0 日: "今日"
 *   - 1 日: "昨日"
 *   - 2〜13 日: "N 日前"
 *   - 14〜29 日: "M 週間前" (端数切り捨て)
 *   - 30〜364 日: "M ヶ月前" (30 日 / 月で換算、端数切り捨て)
 *   - 365 日以上: "M 年前"
 *
 * 「やばさレベル」(level) は Pane2 で色分け表示するために使う:
 *   - fresh:  〜13 日 (緑、最近触れた)
 *   - aging:  14〜29 日 (黄、そろそろフォロー必要)
 *   - stale:  30 日以上 (赤、放置中)
 *
 * 未来日 (テスト用の異常データ等) は null を返す (表示しない)。
 *
 * タイムゾーン対応: `parseISODate` で YYYY-MM-DD をローカルタイム 0 時として
 * 扱う。素朴な `new Date("2026-05-25")` は UTC 0 時パースで UTC-X 圏のブラウザ
 * で「1 日早い」表示になる不具合を回避。
 */

import { parseISODate, todayPartsJST } from "./profile";

export type LastContactBadge = {
  /** 表示文字列 (例: "今日" / "12 日前" / "3 週間前" / "半年前" / "1 年前") */
  text: string;
  /** Tailwind カラークラス */
  className: string;
  /** やばさレベル (Pane2 のドット色などで使う) */
  level: "fresh" | "aging" | "stale";
  /** 経過日数 (テストやデバッグ用) */
  diffDays: number;
};

/**
 * YYYY-MM-DD 形式の日付文字列から相対表記バッジを返す。
 * null / 空 / 無効日付 / 未来日 は null (= 表示しない) を返す。
 */
export function getLastContactBadge(
  date: string | null,
  now: Date = new Date(),
): LastContactBadge | null {
  if (!date) return null;
  const target = parseISODate(date);
  if (!target) return null;

  const targetUtc = Date.UTC(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
  );
  // 「今日」は常に日本時間（Asia/Tokyo）で判定（SSR=UTC とクライアント=JST の
  // 暦日ズレによる「今日↔昨日」ちらつきを防ぐ）。
  const t = todayPartsJST(now);
  const todayUtc = Date.UTC(t.year, t.month - 1, t.day);
  const diffDays = Math.round((todayUtc - targetUtc) / (1000 * 60 * 60 * 24));

  // 未来日は表示しない (異常データ防御)
  if (diffDays < 0) return null;

  if (diffDays === 0) {
    return {
      text: "今日",
      className: "text-emerald-700",
      level: "fresh",
      diffDays,
    };
  }
  if (diffDays === 1) {
    return {
      text: "昨日",
      className: "text-emerald-700",
      level: "fresh",
      diffDays,
    };
  }
  if (diffDays < 14) {
    return {
      text: `${diffDays}日前`,
      className: "text-emerald-700",
      level: "fresh",
      diffDays,
    };
  }
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return {
      text: `${weeks}週間前`,
      className: "text-amber-700",
      level: "aging",
      diffDays,
    };
  }
  if (diffDays < 365) {
    // 30 日 / 月で換算 (営業実務として「先月」「2ヶ月前」が直感的)。
    // ISO カレンダー上の正確な「月差」ではないが、最終接触からの経過感覚として
    // は十分な精度。
    const months = Math.floor(diffDays / 30);
    return {
      text: `${months}ヶ月前`,
      className: "text-rose-700",
      level: "stale",
      diffDays,
    };
  }
  const years = Math.floor(diffDays / 365);
  return {
    text: `${years}年前`,
    className: "text-rose-700",
    level: "stale",
    diffDays,
  };
}
