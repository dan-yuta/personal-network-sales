/**
 * 候補者アバターの色割り当てヘルパー。
 *
 * 候補者ごとに別の色のアバターを表示することで、Pane 2 候補者リスト・
 * Pane 3 ヘッダー・Pane 4 ヘッダーで「同一人物の視覚マーカー」として
 * 機能させる (どこを見ても「鈴木さん = 青」が一致する)。
 *
 * 仕組み: 名前先頭文字の charCode を 8 色 (Tailwind カラー) のローテーションに
 * mod で割り当てる単純な決定論的 hash。
 */

/** Tailwind の薄い背景 + 濃い文字色の組み合わせ (8 色)。視認性確保のためコントラスト確認済み。 */
const AVATAR_COLORS = [
  "bg-emerald-100 text-emerald-700",
  "bg-sky-100 text-sky-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-violet-100 text-violet-700",
  "bg-orange-100 text-orange-700",
  "bg-cyan-100 text-cyan-700",
  "bg-pink-100 text-pink-700",
] as const;

/**
 * 候補者名から決定論的にアバター色クラスを返す。
 * @param name 候補者名 (空文字列でも安全)
 * @returns `"bg-XXX-100 text-XXX-700"` 形式の Tailwind クラス文字列
 */
export function avatarColorFor(name: string): string {
  const code = name.charCodeAt(0);
  if (Number.isNaN(code)) return AVATAR_COLORS[0];
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}
