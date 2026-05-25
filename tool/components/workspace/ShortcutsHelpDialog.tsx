"use client";

/**
 * キーボードショートカット一覧を表示するヘルプダイアログ。
 * `?` キー (Shift+/) で開く。100 人運用でツール慣れしたユーザー向けに
 * 「キーで完結する操作」の存在を学べる場として機能する。
 *
 * 一覧データは Workspace の useEffect 側 (実装) と同期させる必要があるが、
 * ハードコードした表が「ドキュメント代わり」として機能するので
 * 二重管理は許容する (実装と一覧の差分はテスト or レビューで検出)。
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Shortcut = {
  keys: readonly string[];
  description: string;
};

type ShortcutGroup = {
  heading: string;
  items: readonly Shortcut[];
};

const SHORTCUT_GROUPS: readonly ShortcutGroup[] = [
  {
    heading: "ナビゲーション",
    items: [
      { keys: ["↑", "K"], description: "前の候補者へ" },
      { keys: ["↓", "J"], description: "次の候補者へ" },
      { keys: ["/"], description: "検索ボックスにフォーカス" },
    ],
  },
  {
    heading: "ステージ絞り込み",
    items: [
      { keys: ["1"], description: "未連絡" },
      { keys: ["2"], description: "アプローチ中" },
      { keys: ["3"], description: "商談中" },
      { keys: ["4"], description: "契約" },
      { keys: ["5"], description: "失注" },
      { keys: ["6"], description: "保留" },
      { keys: ["Esc"], description: "絞り込み + 検索を全解除" },
    ],
  },
  {
    heading: "ヘルプ",
    items: [
      { keys: ["?"], description: "このヘルプを開く" },
    ],
  },
];

export function ShortcutsHelpDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>キーボードショートカット</DialogTitle>
          <DialogDescription>
            入力欄にフォーカスがあるときは無効。Cmd / Ctrl / Alt との同時押しは
            ブラウザ側に優先します。
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-5 pt-2">
          {SHORTCUT_GROUPS.map((group) => (
            <section key={group.heading} className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {group.heading}
              </h3>
              <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-1.5 text-sm">
                {group.items.map((s, i) => (
                  <ShortcutRow key={`${group.heading}-${i}`} shortcut={s} />
                ))}
              </dl>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ShortcutRow({ shortcut }: { shortcut: Shortcut }) {
  return (
    <>
      <dt className="flex items-center gap-1">
        {shortcut.keys.map((k, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && (
              <span className="text-[10px] text-muted-foreground">or</span>
            )}
            <kbd className="inline-flex min-w-[1.75rem] items-center justify-center rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs font-medium text-foreground shadow-sm">
              {k}
            </kbd>
          </span>
        ))}
      </dt>
      <dd className="text-sm text-muted-foreground">{shortcut.description}</dd>
    </>
  );
}
