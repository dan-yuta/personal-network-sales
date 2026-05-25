"use client";

/**
 * PrioritySelectField — 優先度 (高/中/低/未設定) を切り替えるトグルボタン群。
 *
 * 3 つしかない選択肢で、ドロップダウンを 1 段挟むより **直接タップできる**
 * 方が速い。ラジオボタン的に 1 つだけ active、active な値を再クリックすると
 * 「未設定」に戻る (= radio + undo がワンクリック)。
 *
 * 配色は PRIORITY_THEME (lib/labels.ts) に集約: 高=rose / 中=amber / 低=slate。
 * 未設定の active 色は無し (= outline 状態)。
 *
 * Pane3「営業条件」カードの InlineFieldRow 内で使う想定。横幅は max-content。
 */

import { cn } from "@/lib/utils";
import { type PriorityKey, PRIORITY_KEYS } from "@/lib/schema";
import {
  PRIORITY_DESCRIPTIONS,
  PRIORITY_LABELS,
  PRIORITY_THEME,
} from "@/lib/labels";

export type PrioritySelectFieldProps = {
  /** 現在値。"" は未設定 */
  value: PriorityKey | "";
  /** 値変更ハンドラ。再クリックで "" (未設定) が来る */
  onSave: (v: PriorityKey | "") => void;
  /** スクリーンリーダー向けラベル */
  ariaLabel: string;
};

export function PrioritySelectField({
  value,
  onSave,
  ariaLabel,
}: PrioritySelectFieldProps) {
  // ボタン群 + 選択中の基準説明文 (1 行) を縦に並べる。
  // 選択中の優先度の意味だけを下に出すことで、未選択時はヘルプが消えて
  // 静かになり、選択した瞬間に「これは月 1〜2 回フォロー、で合っている?」と
  // 自己確認できる動線にする。
  return (
    <div className="flex flex-col gap-1">
      <div
        role="radiogroup"
        aria-label={ariaLabel}
        className="inline-flex items-center gap-1"
      >
        {PRIORITY_KEYS.map((key) => {
          const active = value === key;
          const theme = PRIORITY_THEME[key];
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onSave(active ? "" : key)}
              title={`${PRIORITY_LABELS[key]}: ${PRIORITY_DESCRIPTIONS[key]}`}
              className={cn(
                "inline-flex h-7 min-w-[2.5rem] items-center justify-center rounded-md border px-2.5 text-xs font-medium",
                "transition-colors outline-none",
                "focus-visible:ring-2 focus-visible:ring-ring/50",
                active
                  ? theme.activeClass
                  : "border-input bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {PRIORITY_LABELS[key]}
            </button>
          );
        })}
      </div>
      {/* 選択中の優先度の基準説明 (未選択時は非表示)。
          フォロー密度の目安として「直近 2 週で動かす」「月 1〜2 回」「月 1 以下」
          のシンプルなルールを示す。 */}
      {value !== "" && (
        <p className="text-[11px] text-muted-foreground" aria-live="polite">
          {PRIORITY_LABELS[value]}: {PRIORITY_DESCRIPTIONS[value]}
        </p>
      )}
    </div>
  );
}
