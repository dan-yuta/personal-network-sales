"use client";

/**
 * 検索ヒット箇所を <mark> でハイライト表示するインライン span。
 *
 * 「鈴木」で検索したら名前・接触経路の中で該当文字列が黄色く光る。
 * Pane2 候補者行 (SortableCandidateRow) と Archived 行 (CandidateListPane) で
 * 共通利用する。
 *
 * tokens が空 / マッチなしなら元文字列をそのまま返し、追加 DOM ゼロ (素通り)。
 *
 * デフォルト <mark> スタイル (黄背景・黒文字) を Tailwind で再定義し、selected 行
 * (accent 背景 = 薄緑) でも視認できるよう yellow-200 + text-foreground で
 * 統一。鋭い識別性を維持しながら違和感のない外見に揃える。
 */

import { splitByMatches } from "@/lib/computed/searchHighlight";

export function HighlightedText({
  text,
  tokens,
}: {
  text: string;
  tokens: readonly string[];
}) {
  const segments = splitByMatches(text, tokens);
  // 単一セグメント (= マッチ無し) なら追加 DOM ゼロで素通り
  if (segments.length === 1 && !segments[0].match) {
    return <>{text}</>;
  }
  return (
    <>
      {segments.map((seg, i) =>
        seg.match ? (
          <mark
            key={i}
            className="rounded bg-yellow-200 px-0.5 text-foreground"
          >
            {seg.text}
          </mark>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
  );
}
