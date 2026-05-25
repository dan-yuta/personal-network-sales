"use client";

/**
 * 軽量 Toast 通知 (依存追加なし、Context + useReducer 方式)。
 *
 * 設計目的:
 *   - D&D ステージ移動、アーカイブ、削除のような **取り返しがつかない見える操作** に
 *     対して、Gmail / Slack 流の「実行 + Undo ボタン付きトースト」を提供する。
 *   - 心理的安全性 ("間違えても戻せる") が決断速度を上げる (Hick の法則対策)。
 *
 * UX 規約:
 *   - 画面右下に縦スタック、最新が下に積まれる
 *   - 自動消滅 5 秒 (Undo ボタンクリック / 手動 × で即時消える)
 *   - 同時表示は最大 5 件 (古いものから dismiss)
 *   - Undo は 1 回だけ実行可能 (連打で副作用が二重に発火しないよう disable)
 *
 * 提供 API:
 *   - `<ToasterProvider>`: アプリ全体を包む Provider
 *   - `useToast()`: `{ push, dismiss }` を返すフック
 *     - `push({ message, undo?, duration? }): id`
 *     - `dismiss(id)`
 *
 * 既存 sonner / radix-toast を入れない理由:
 *   - 新規依存を増やさず POC を軽く保つ
 *   - 機能は「メッセージ + 自動消滅 + Undo」だけで足りる
 *   - shadcn / Base UI の Toast プリミティブとの整合は将来差し替え時に判断
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import { Undo2, X } from "lucide-react";

import { cn } from "@/lib/utils";

export type ToastInput = {
  message: string;
  /** Undo クリック時に呼ぶハンドラ。指定すると「元に戻す」ボタンが出る */
  undo?: () => void;
  /** 自動消滅までの ms。デフォルト 5000 */
  duration?: number;
};

type ToastEntry = {
  id: string;
  message: string;
  undo?: () => void;
  /** Undo ボタンが既に使われたか (二重発火防止) */
  undoUsed: boolean;
  duration: number;
};

type Action =
  | { type: "push"; toast: ToastEntry }
  | { type: "dismiss"; id: string }
  | { type: "markUndoUsed"; id: string };

function reducer(state: ToastEntry[], action: Action): ToastEntry[] {
  switch (action.type) {
    case "push": {
      // 同時表示最大 5 件、上限超過なら最も古いものを drop
      const next = [...state, action.toast];
      if (next.length > 5) next.shift();
      return next;
    }
    case "dismiss":
      return state.filter((t) => t.id !== action.id);
    case "markUndoUsed":
      return state.map((t) =>
        t.id === action.id ? { ...t, undoUsed: true } : t,
      );
  }
}

type ToastContextValue = {
  push: (input: ToastInput) => string;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToasterProvider({ children }: { children: ReactNode }) {
  const [toasts, dispatch] = useReducer(reducer, []);
  // 自動消滅用 timer の id を toast id ごとに保持。Provider unmount や dismiss で
  // clearTimeout する。
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  // Provider 自体が unmount するときは全 timer をクリア
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const t of timers.values()) clearTimeout(t);
      timers.clear();
    };
  }, []);

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    dispatch({ type: "dismiss", id });
  }, []);

  const push = useCallback(
    (input: ToastInput): string => {
      const id = `toast-${crypto.randomUUID()}`;
      const duration = input.duration ?? 5000;
      const entry: ToastEntry = {
        id,
        message: input.message,
        undo: input.undo,
        undoUsed: false,
        duration,
      };
      dispatch({ type: "push", toast: entry });
      // 自動消滅 timer (duration <= 0 なら永続表示)
      if (duration > 0) {
        const timer = setTimeout(() => {
          timersRef.current.delete(id);
          dispatch({ type: "dismiss", id });
        }, duration);
        timersRef.current.set(id, timer);
      }
      return id;
    },
    [],
  );

  const handleUndo = useCallback(
    (id: string) => {
      // 二重発火防止: dispatch で既に usedmark → undo() 実行 → dismiss
      const target = toasts.find((t) => t.id === id);
      if (!target || target.undoUsed || !target.undo) return;
      dispatch({ type: "markUndoUsed", id });
      target.undo();
      dismiss(id);
    },
    [toasts, dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({ push, dismiss }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport
        toasts={toasts}
        onUndo={handleUndo}
        onDismiss={dismiss}
      />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast は <ToasterProvider> の内側で使う必要があります");
  }
  return ctx;
}

function ToastViewport({
  toasts,
  onUndo,
  onDismiss,
}: {
  toasts: ToastEntry[];
  onUndo: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div
      role="region"
      aria-label="通知"
      aria-live="polite"
      className="pointer-events-none fixed right-4 bottom-4 z-50 flex max-w-sm flex-col gap-2"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-sm shadow-md",
            "animate-in slide-in-from-right-4 fade-in duration-200 motion-reduce:animate-none",
          )}
        >
          <span className="min-w-0 flex-1 truncate text-foreground">
            {t.message}
          </span>
          {t.undo && (
            <button
              type="button"
              onClick={() => onUndo(t.id)}
              disabled={t.undoUsed}
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-medium text-primary",
                "transition-colors outline-none hover:bg-primary/15 focus-visible:ring-2 focus-visible:ring-ring/50",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
              aria-label="操作を元に戻す"
            >
              <Undo2 aria-hidden="true" className="size-3.5" />
              元に戻す
            </button>
          )}
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            aria-label="通知を閉じる"
            className="inline-flex shrink-0 size-6 items-center justify-center rounded text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <X aria-hidden="true" className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
