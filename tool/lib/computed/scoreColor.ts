/**
 * 平均スコアの色分けヘルパー。
 *
 * Pane2 候補者リスト・Pane3 ヘッダー・Pane3 評価カードで「同じ 2.8 が
 * 場所によって黒だったり赤だったり」という非一貫性を解消するため、
 * 単一のしきい値で色を決める。
 *
 *   - 4.5 以上: emerald-600 (注力候補が一目でわかる)
 *   - 3.0 未満: rose-600 (関係性 / レスポンスが弱い候補)
 *   - 中間 (3.0〜4.4): デフォルト色 (text-foreground/80)
 *   - 未評価 (null): text-muted-foreground
 *
 * Pane2 行で `selected = true` のときは背景色との衝突を避けるため、
 * 呼び出し側で `text-accent-foreground` を上書きする (この関数では考慮しない)。
 */
export function getScoreColorClass(avg: number | null): string {
  if (avg === null) return "text-muted-foreground";
  if (avg >= 4.5) return "text-emerald-600";
  if (avg < 3.0) return "text-rose-600";
  return "text-foreground/80";
}
