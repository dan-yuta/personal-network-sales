"use client";

/**
 * InlineTextField — Pane 4 編集 UI の「1 行 input」プリミティブ。
 *
 * shadcn `<Input>` をラップし、Lab v3 で確定した規律で編集体験を統一する:
 *   - 常に `<Input>` 表示（Type-direct、ADR-0014）
 *   - `border-input` + `bg-card` で「手前」感を出し、編集可能と一目で分かる
 *   - 保存: blur / Enter / 自動保存タイマー（値が変わっていれば onSave）
 *   - キャンセル: Esc で defaultValue に戻して blur
 *   - **未保存インジケータ** (●, rose): 編集中で未保存の間、右端に常駐
 *   - **自動保存**: 最後の打鍵から 800ms 経過で onSave をトリガ (フォーカス維持)
 *
 * 設計変更 (G): uncontrolled (defaultValue + key={value} 戦略) を撤回し、
 * **controlled (value/onChange)** に切り替えた。
 *   - 旧戦略の問題: 自動保存で親 value が更新されると key={value} で input が
 *     remount され、編集中のフォーカスが失われる。連続入力できない。
 *   - 新戦略: draft 状態を内部で持ち、value プロップ変化は useEffect で同期。
 *     input は完全 controlled で、フォーカスを失わずに親保存と整合する。
 */

import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** 自動保存トリガまでのアイドル時間 (ms)。タイプを止めてからこの ms 経過で
 *  onSave を発火する (フォーカスは外さない、続けて入力できる)。
 *
 *  800ms は「IME 変換中の数文字入力」を待てる長さ + 「タイプを止めて視線を
 *  外す前に確定する」短さ、のバランス点。極端に短いと変換途中で発火、
 *  極端に長いと「保存ボタンが無い不安」が残る。 */
const AUTOSAVE_IDLE_MS = 800;

export type InlineTextFieldProps = {
  /** 現在の値（空文字で「未設定」placeholder 表示） */
  value: string;
  /** 値が変わって blur した時に呼ばれる */
  onSave: (v: string) => void;
  /** スクリーンリーダー向けラベル */
  ariaLabel: string;
  /** input の type 属性（`text` / `email` / `tel` / `number`） */
  inputType?: "text" | "email" | "tel" | "number";
  /** 空のときの placeholder。デフォルト "未設定" */
  placeholder?: string;
  /** className override（width 制限などに使う） */
  className?: string;
};

export function InlineTextField({
  value,
  onSave,
  ariaLabel,
  inputType = "text",
  placeholder,
  className,
}: InlineTextFieldProps) {
  // draft は input に表示中の値。controlled なので value プロップではなく
  // この state を input.value に渡す。親 value 変化は useEffect で取り込む。
  const [draft, setDraft] = useState(value);
  // IME 変換中 (compositionstart 〜 compositionend) は autosave を抑制し、
  // 半角→全角への確定前に発火して未確定文字列が確定保存される事故を防ぐ。
  const composingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 親 value 変化を draft に同期 (他者編集 / undo / 候補者切替などで起こる)。
  // composing 中は IME 確定を邪魔したくないので同期スキップ (確定後の
  // compositionend で別途反映される)。
  useEffect(() => {
    if (composingRef.current) return;
    setDraft(value);
  }, [value]);

  // アンマウント時にタイマー回収
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, []);

  const clearAutosaveTimer = () => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
  };

  const scheduleAutosave = () => {
    clearAutosaveTimer();
    autosaveTimerRef.current = setTimeout(() => {
      autosaveTimerRef.current = null;
      if (composingRef.current) return;
      // 最新の input.value (= draft) を直接読んで保存。フォーカスは外さず
      // 維持するので、ユーザーは続けて編集できる。
      const current = inputRef.current?.value ?? "";
      if (current !== value) onSave(current);
    }, AUTOSAVE_IDLE_MS);
  };

  const dirty = draft !== value;

  return (
    <span className="relative inline-block w-full">
      <Input
        ref={inputRef}
        type={inputType}
        value={draft}
        placeholder={placeholder ?? "未設定"}
        aria-label={ariaLabel}
        onChange={(e) => {
          setDraft(e.target.value);
          if (!composingRef.current) scheduleAutosave();
        }}
        onCompositionStart={() => {
          composingRef.current = true;
          clearAutosaveTimer();
        }}
        onCompositionEnd={(e) => {
          composingRef.current = false;
          // 変換確定後の値で draft 更新 + autosave 再スケジュール
          setDraft((e.target as HTMLInputElement).value);
          scheduleAutosave();
        }}
        onBlur={(e) => {
          clearAutosaveTimer();
          if (e.target.value !== value) onSave(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            (e.target as HTMLInputElement).blur();
          } else if (e.key === "Escape") {
            clearAutosaveTimer();
            setDraft(value);
            (e.target as HTMLInputElement).blur();
          }
        }}
        className={cn(
          "h-8 bg-card",
          // 未保存中は input 右端に小さい「●」マーカーをかぶせる: padding-right で
          // 文字が ● と被らないよう逃がす。
          dirty && "pr-6",
          className,
        )}
      />
      {dirty && (
        <span
          aria-label="未保存"
          title="未保存 (Enter or Tab / 0.8秒待機で自動保存)"
          className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-rose-500"
        >
          {/* size 6px のドット (line-height で水平中央) */}
          <span
            aria-hidden="true"
            className="block size-1.5 rounded-full bg-current"
          />
        </span>
      )}
    </span>
  );
}
