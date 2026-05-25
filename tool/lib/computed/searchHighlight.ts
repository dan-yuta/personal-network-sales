/**
 * 検索ヒット箇所のハイライト計算ヘルパー。
 *
 * 検索クエリ (tokens) に対して、表示文字列 (text) のどこがマッチしているかを
 * 区間として返す。`splitByMatches` の戻り値を <mark> と <span> に分けて
 * レンダリングすることで、「鈴木」検索時に名前・接触経路・メモの中で
 * マッチした文字列が黄色く光る、Gmail / Slack 流の検索体験を提供する。
 *
 * 設計上の割り切り:
 *   - 元文字列上の case-insensitive な部分一致のみ検出する (lowercase 比較)。
 *   - 検索ロジック側 (lib/computed/searchNormalize.ts) は NFKC + カタカナ→
 *     ひらがな正規化までするが、ハイライトでは元文字列上のマッチに留める。
 *     「タナカ」検索 → 「タナカ」(全角カタカナそのまま) はハイライト、
 *     「たなか」(ひらがな表記) や「TANAKA」(英字) は検索結果には出るが
 *     光らない。100 人運用での実用上、検索結果が出ていれば
 *     「なぜヒットしたか」は文脈で読めるため、まず元文字列マッチで
 *     カバー率を上げる方針。
 *   - 空 tokens / 空 text は素通り (元文字列 1 セグメントだけ)。
 *
 * 重複・隣接マッチは正規化 (merge) してまとめる。例:
 *   text="鈴木鈴木", tokens=["鈴木"] → [match: "鈴木鈴木"] (まとめて 1 セグメント)
 */

export type HighlightSegment = {
  text: string;
  /** マッチした区間なら true */
  match: boolean;
};

/**
 * `text` を `tokens` で分割し、マッチ区間/非マッチ区間のセグメント配列を返す。
 *
 * - tokens が空 / 全て空文字なら、元文字列 1 つの非マッチセグメントを返す
 * - 検索は case-insensitive (locale 無関係の lowercase 比較)
 * - 複数 tokens の重なり / 連続 / 重複は 1 つの match セグメントにマージ
 */
export function splitByMatches(
  text: string,
  tokens: readonly string[],
): HighlightSegment[] {
  if (!text) return [];
  // 空 token は除外、長さ降順でソート (長い token を優先してマッチさせる)
  const validTokens = tokens
    .filter((t) => t.length > 0)
    .map((t) => t.toLowerCase())
    .sort((a, b) => b.length - a.length);
  if (validTokens.length === 0) {
    return [{ text, match: false }];
  }

  const lower = text.toLowerCase();
  // [start, end) のマッチ区間を列挙
  const ranges: Array<[number, number]> = [];
  for (const token of validTokens) {
    let from = 0;
    while (from <= lower.length - token.length) {
      const idx = lower.indexOf(token, from);
      if (idx < 0) break;
      ranges.push([idx, idx + token.length]);
      from = idx + 1; // 次の検索開始位置 (重複検出のため +1)
    }
  }
  if (ranges.length === 0) {
    return [{ text, match: false }];
  }

  // 区間をソート + マージ (隣接・重複は 1 区間に統合)
  ranges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged: Array<[number, number]> = [];
  for (const [s, e] of ranges) {
    if (merged.length === 0 || merged[merged.length - 1][1] < s) {
      merged.push([s, e]);
    } else {
      // 重なる場合は end を max にして統合
      const last = merged[merged.length - 1];
      last[1] = Math.max(last[1], e);
    }
  }

  // セグメント化
  const segments: HighlightSegment[] = [];
  let cursor = 0;
  for (const [s, e] of merged) {
    if (cursor < s) {
      segments.push({ text: text.slice(cursor, s), match: false });
    }
    segments.push({ text: text.slice(s, e), match: true });
    cursor = e;
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), match: false });
  }
  return segments;
}

/**
 * 検索クエリ文字列 (UI 上の searchQuery) を空白区切りで tokens 配列に分割。
 * Workspace の検索フィルタロジック (matchSearch) と同じトークナイズだが、
 * normalize はしない (ハイライト側は元文字列ベース)。
 */
export function tokenizeQuery(query: string): string[] {
  if (!query) return [];
  return query
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0);
}
