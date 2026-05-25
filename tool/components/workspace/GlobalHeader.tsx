"use client";

import { useState } from "react";
import { Settings } from "lucide-react";

import { type Department } from "@/lib/schema";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SettingsDialogContent } from "@/components/workspace/SettingsDialog";

type GlobalHeaderProps = {
  departmentTitle: string;
  positionTitle: string;
  candidateName: string;
  departments: Department[];
  onAddDepartment: (name: string) => void;
  onDeleteDepartment: (deptId: string) => void;
  /** 設定ダイアログ内「キーボードショートカット一覧を見る」ボタン押下時に
   *  呼ばれる。Workspace 側で ShortcutsHelpDialog を open する想定。
   *  本コンポーネント内では設定ダイアログを同時に閉じる (ネスト回避)。 */
  onOpenShortcutsHelp: () => void;
};

export function GlobalHeader({
  departmentTitle,
  positionTitle,
  candidateName,
  departments,
  onAddDepartment,
  onDeleteDepartment,
  onOpenShortcutsHelp,
}: GlobalHeaderProps) {
  // 設定ダイアログを controlled にして、「ショートカットへ遷移」時に閉じる
  // ロジックをここで完結させる。
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-3">
      <Breadcrumb
        className="min-w-0 flex-1 overflow-hidden"
        aria-label="パンくず"
      >
        <BreadcrumbList className="flex-nowrap text-[11px]">
          <BreadcrumbItem className="shrink-0">
            <span>{departmentTitle}</span>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem className="shrink-0">
            <span>{positionTitle}</span>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem className="min-w-0">
            <BreadcrumbPage className="truncate font-medium">
              {candidateName}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <Tooltip>
          <TooltipTrigger
            render={
              <DialogTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label="ワークスペース設定"
                  >
                    <Settings />
                  </Button>
                }
              />
            }
          />
          <TooltipContent side="bottom">ワークスペース設定</TooltipContent>
        </Tooltip>
        <SettingsDialogContent
          departments={departments}
          onAddDepartment={onAddDepartment}
          onDeleteDepartment={onDeleteDepartment}
          onOpenShortcutsHelp={() => {
            // 設定ダイアログを閉じてからヘルプダイアログを開く
            // (ダイアログのネストを避け、フォーカストラップの混乱を防止)。
            setSettingsOpen(false);
            onOpenShortcutsHelp();
          }}
        />
      </Dialog>
    </header>
  );
}
