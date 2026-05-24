/**
 * 候補者アバターの色割り当てヘルパー。
 *
 * 候補者ごとに別の色のアバターを表示することで、Pane 2 候補者リスト・
 * Pane 3 ヘッダー・Pane 4 ヘッダーで「同一人物の視覚マーカー」として
 * 機能させる (どこを見ても「鈴木さん = 青」が一致する)。
 *
 * 仕組み: FNV-1a (32bit) で名前全体を hash し、7 色 (Tailwind カラー) の
 * ローテーションに mod で割り当てる決定論的 hash。日本語の姓・名で
 * 先頭 1 文字の charCode が偏る (例: 中村・中島が同色衝突、田中・佐藤・
 * 高橋・加藤・木村 が全員 emerald に集中) 問題を、全文字を hash に
 * 取り込むことで分散させる。
 *
 * カラーパレットからは rose を意図的に除外している:
 *   - 期限バッジ (今日/明日) で rose-100 を使う
 *   - STAGE_THEME.lost (失注) で rose を使う
 *   - スコア低 (avg < 3.0) で text-rose-600 を使う
 *   → アバターに rose が当たると Pane3 ヘッダーが赤一色になる事故を防ぐ
 */

/**
 * Tailwind の薄い背景 + 濃い文字色の組み合わせ (7 色)。
 * 視認性確保のためコントラスト確認済み (WCAG AA 以上)。
 * STAGE_THEME / 期限バッジ / 接触ログ手段カラーと衝突しないよう rose は除外。
 */
const AVATAR_COLORS = [
  "bg-emerald-100 text-emerald-700",
  "bg-sky-100 text-sky-700",
  "bg-amber-100 text-amber-700",
  "bg-violet-100 text-violet-700",
  "bg-orange-100 text-orange-700",
  "bg-cyan-100 text-cyan-700",
  "bg-pink-100 text-pink-700",
] as const;

/**
 * FNV-1a (32bit) hash。日本語 (BMP 範囲) でも CJK 拡張漢字 (サロゲートペア)
 * でも codePointAt で正しい code point を取得し、xor → multiply。
 * `>>> 0` で 32bit 符号なし整数に正規化。
 */
function fnv1aHash(s: string): number {
  let hash = 2166136261; // FNV offset basis (32bit)
  for (let i = 0; i < s.length; i++) {
    hash ^= s.codePointAt(i) ?? 0;
    hash = (hash * 16777619) >>> 0; // FNV prime (32bit)
  }
  return hash;
}

/**
 * 候補者名から決定論的にアバター色クラスを返す。
 * 同じ名前なら必ず同じ色 (Pane 切替で同一人物が同色で識別される)。
 *
 * @param name 候補者名 (空文字列でも安全)
 * @returns `"bg-XXX-100 text-XXX-700"` 形式の Tailwind クラス文字列
 */
export function avatarColorFor(name: string): string {
  if (!name) return AVATAR_COLORS[0];
  return AVATAR_COLORS[fnv1aHash(name) % AVATAR_COLORS.length];
}
