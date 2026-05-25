"use client";

import { type CSSProperties, type ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreHorizontal, Star } from "lucide-react";

import { cn } from "@/lib/utils";
import { type CandidateRow, type StageKey } from "@/lib/schema";
import { getDeadlineBadge } from "@/lib/computed/deadline";
import { getScoreColorClass } from "@/lib/computed/scoreColor";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Pane 2 のステージグループ用、ドラッグ可能な候補者行。
 *
 * - 行全体クリック = 候補者を選択（onSelect 経由）
 * - 左端のグリップだけが drag listener を持つ。`MoreHorizontal` メニューや
 *   行クリックとは衝突しない（`activationConstraint: distance` でも吸収済み）
 * - DragOverlay 描画中は `isDragging` で半透明 + pointer-events 抑止
 *
 * archived グループの行はドラッグさせないため、本コンポーネントは stage グループ
 * 専用。archived は CandidateListPane 側の通常 `<li>` で描画する。
 *
 * 表示情報:
 *   - 1 行目: アバター (候補者ごとに色違い) + 氏名 + スコアバッジ (高/中/低 色分け)
 *   - 2 行目: 接触経路 (source) の短縮 + 期限バッジ (今日/明日/あとN日/MM-DD)
 */
export function SortableCandidateRow({
  cand,
  stage,
  selected,
  onSelect,
  actions,
}: {
  cand: CandidateRow;
  stage: StageKey;
  selected: boolean;
  onSelect: (id: string) => void;
  actions: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: cand.id,
    data: { containerId: stage, name: cand.name },
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const deadline = getDeadlineBadge(cand.nextActionDate);

  // ホバー時のブラウザ標準ツールチップ。Pane2 の限られた幅で truncate されてしまう
  // source や日付・スコアの「全体像」を確認できるようにする。
  // 改行 `\n` は Mac Safari など一部ブラウザで半角スペース化されるので、
  // 区切り文字を ` / ` に統一して全ブラウザで読める形に。
  const tooltipParts = [
    cand.source || null,
    cand.nextActionDate ? `次回アクション ${cand.nextActionDate}` : null,
    cand.averageScore !== null
      ? `★ ${cand.averageScore.toFixed(1)}/5`
      : "未評価",
  ].filter(Boolean) as string[];
  const tooltipText = `${cand.name} — ${tooltipParts.join(" / ")} (クリックで詳細表示)`;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "group/candidate relative",
        isDragging && "pointer-events-none opacity-50",
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(cand.id)}
        title={tooltipText}
        className={cn(
          "flex w-full items-start gap-2 rounded-md px-2.5 py-2 text-left transition-colors",
          "outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          selected
            ? "bg-accent text-accent-foreground"
            : "text-foreground hover:bg-muted",
        )}
      >
        {/*
          ドラッグハンドル。HTML5 仕様上 `<button>` の子孫に interactive 要素を
          置くのは厳密には違反 (nested interactive)。今は `<span>` (= phrasing content)
          + dnd-kit の listeners + stopPropagation で機能上の衝突は回避しているが、
          a11y ツリー的には grip が button 内に存在し続ける。Tab で 2 段階フォーカス
          が起きる可能性あり (focus-visible で grip にもリングが出る挙動はこれに依存)。
          将来 grip を <button> 外に absolute 配置する場合、MoreHorizontal ボタンと
          同じ構造に揃えるとよい。
        */}
        <span
          {...attributes}
          {...listeners}
          aria-label={`${cand.name} の並び替え`}
          className={cn(
            "mt-1 flex size-5 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground",
            "opacity-0 transition-opacity group-focus-within/candidate:opacity-100 group-hover/candidate:opacity-100",
            "hover:text-foreground active:cursor-grabbing",
            "outline-none focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical aria-hidden="true" className="size-4" />
        </span>
        <Avatar className="mt-0.5 size-8 shrink-0">
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
            {cand.name[0] ?? "?"}
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {/* 1 行目: 氏名 + スコア */}
          <div className="flex items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-sm">{cand.name}</p>
            <span className="shrink-0 transition-opacity group-focus-within/candidate:opacity-0 group-hover/candidate:opacity-0">
              <ScoreBadge avg={cand.averageScore} selected={selected} />
            </span>
          </div>
          {/* 2 行目: 接触経路の短縮 + 期限バッジ */}
          {(cand.source || deadline) && (
            <div
              className={cn(
                "flex items-center gap-2 text-xs",
                selected ? "text-accent-foreground/70" : "text-muted-foreground",
              )}
            >
              {cand.source && (
                <span className="min-w-0 flex-1 truncate" title={cand.source}>
                  {cand.source}
                </span>
              )}
              {deadline && (
                <span
                  className={cn(
                    "shrink-0 rounded px-1.5 py-0.5 font-medium",
                    deadline.className,
                  )}
                  aria-label={`次回アクション日 ${cand.nextActionDate}`}
                >
                  {deadline.text}
                </span>
              )}
            </div>
          )}
        </div>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className={cn(
                "absolute top-2 right-1",
                "opacity-0 group-focus-within/candidate:opacity-100 group-hover/candidate:opacity-100",
                "transition-opacity",
                "text-muted-foreground hover:text-foreground",
              )}
              aria-label={`${cand.name} の操作`}
            >
              <MoreHorizontal />
            </Button>
          }
        />
        <DropdownMenuContent side="right" align="start">
          <DropdownMenuGroup>{actions}</DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

/**
 * 平均スコアのバッジ表示。`getScoreColorClass` で 4.5+ 緑 / <3.0 赤 /
 * 中間デフォルト / 未評価グレーに統一。
 *
 * 旧実装は selected 行で `text-accent-foreground` (= ほぼ黒) を強制していたが、
 * 「2.8 のはずの赤が選択中だけ黒に化ける」非一貫を生んでいたため撤回。
 * accent 背景 (薄緑〜薄グレー) は十分明るく、rose-600 / emerald-600 の
 * コントラストは保たれる。
 */
function ScoreBadge({ avg }: { avg: number | null; selected: boolean }) {
  if (avg === null) {
    return (
      <span
        className="shrink-0 text-xs text-muted-foreground"
        aria-label="未評価"
      >
        —
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 text-xs tabular-nums",
        getScoreColorClass(avg),
      )}
      aria-label={`平均スコア ${avg.toFixed(1)} / 5`}
    >
      <Star aria-hidden className="size-3 fill-current" />
      {avg.toFixed(1)}
    </span>
  );
}
