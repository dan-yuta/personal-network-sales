/**
 * 日付オフセットの汎用ヘルパー。
 *
 * 「今日 / 昨日 / 一昨日」のクイック日付ボタンなど、ローカル日付の n 日前を
 * YYYY-MM-DD で取得する用途で使う。
 *
 * 月跨ぎ・年跨ぎ・うるう年は Date オブジェクト側の桁繰り上げに任せる
 * (Date 既定動作: `new Date(2026, 0, 1 - 1)` → 2025-12-31)。
 */

import { formatISODate } from "./profile";

/**
 * 「今日から n 日前」の日付を YYYY-MM-DD で返す。
 *
 *   - 0 = 今日
 *   - 1 = 昨日
 *   - 2 = 一昨日
 *   - 負数 (-1 等) = 明日 (将来用途)
 *
 * `now` を省略すると `new Date()` を使う。テスト用に外から固定時刻を渡せる。
 *
 * ローカル日付ベース計算。`Date.UTC` ではなく `new Date(年, 月, 日 - n)` で
 * 構築するため、DST 境界を跨いでも年月日成分のみで計算され安定する。
 */
export function dateNDaysAgo(n: number, now: Date = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - n);
  return formatISODate(d);
}
