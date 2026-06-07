"use client";

import { useState } from "react";
import {
  Briefcase,
  CheckCircle,
  MessageCircle,
  MoreHorizontal,
  PauseCircle,
  Share2,
  Trash2,
  UserPlus,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import { type Department, type StageKey, isStageKey } from "@/lib/schema";
import { STAGE_THEME } from "@/lib/labels";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Pane1Toggle } from "@/components/workspace/Pane1Toggle";
import { AddItemDialog } from "@/components/workspace/AddItemDialog";
import { DeleteConfirmDialog } from "@/components/workspace/DeleteConfirmDialog";

// 各ステージの代表アイコン (Lucide)。
//   - screening (未連絡): UserPlus → これから声をかける人を象徴
//   - first (アプローチ中): MessageCircle → 接触を取り始めた段階
//   - referral (紹介進行中): Share2 → 紹介が動いている段階
//   - second (商談中): Briefcase → 商談・条件すり合わせ
//   - final (契約): CheckCircle → 成約・完了
//   - lost (失注): XCircle → 失注・打ち切り
//   - held (保留): PauseCircle → 一時停止
const STAGE_ICON: Record<StageKey, LucideIcon> = {
  screening: UserPlus,
  first: MessageCircle,
  referral: Share2,
  second: Briefcase,
  final: CheckCircle,
  lost: XCircle,
  held: PauseCircle,
};

/** position.id ("stage-screening" 等) から StageKey を抽出する。非ステージなら null。 */
function getStageKey(posId: string): StageKey | null {
  if (!posId.startsWith("stage-")) return null;
  const key = posId.slice("stage-".length);
  return isStageKey(key) ? key : null;
}

type PositionPaneProps = {
  workspaceName: string;
  departments: Department[];
  selectedPositionName?: string;
  onAddPosition: (deptId: string, posName: string) => void;
  onDeletePosition: (deptId: string, posId: string) => void;
  // 営業ツール用: 項目（ステージタブ）クリック時のハンドラ。
  // position.id を上位コンポーネントに渡し、Workspace 側でステージ判定する。
  onSelectPosition?: (positionId: string) => void;
};

export function PositionPane({
  workspaceName,
  departments,
  selectedPositionName,
  onAddPosition,
  onDeletePosition,
  onSelectPosition,
}: PositionPaneProps) {
  const [addDialogDeptId, setAddDialogDeptId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    deptId: string;
    posId: string;
    posName: string;
  } | null>(null);

  const addDialogDept = departments.find((d) => d.id === addDialogDeptId);

  return (
    <>
      <Sidebar
        collapsible="icon"
        className="border-r border-sidebar-border [&_[data-slot=sidebar-container]]:bg-sidebar"
      >
        <SidebarHeader className="border-b border-sidebar-border p-0">
          <div className="flex h-12 items-center justify-between gap-2 px-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[state=expanded]:px-5">
            <h2 className="truncate text-sm font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
              {workspaceName}
            </h2>
            <Pane1Toggle />
          </div>
        </SidebarHeader>

        <SidebarContent className="px-1 py-3 group-data-[collapsible=icon]:hidden">
          {departments.map((dept) => (
            <SidebarGroup key={dept.id} className="px-1">
              <SidebarGroupLabel className="px-2 text-xs font-semibold tracking-wide text-sidebar-foreground/70 uppercase">
                {dept.name}
              </SidebarGroupLabel>
              {/*
                営業ツールではステージ階層を固定 (メインステージ4 + サブステージ2)。
                新規追加された position の id は `p-${Date.now()}` で生まれるが、
                Workspace.handleSelectPosition が `stage-` prefix 以外を弾くため、
                クリックしても何も起きない死操作になる。
                Phase 3 でユーザー定義カテゴリを許容するなら、その時点で再有効化する。
              */}
              <SidebarGroupContent>
                <SidebarMenu>
                  {dept.positions.map((pos) => {
                    const active = pos.name === selectedPositionName;
                    const stageKey = getStageKey(pos.id);
                    const Icon = stageKey ? STAGE_ICON[stageKey] : null;
                    const theme = stageKey ? STAGE_THEME[stageKey] : null;
                    return (
                      <SidebarMenuItem key={pos.id}>
                        <SidebarMenuButton
                          tooltip={`${pos.name}${active ? " (選択中 — もう一度クリックで全候補者に戻す)" : ""}`}
                          isActive={active}
                          aria-current={active ? "page" : undefined}
                          onClick={() => onSelectPosition?.(pos.id)}
                          className={cn(
                            "border-l-4 border-l-transparent",
                            theme && active && theme.leftBar,
                            active
                              ? "bg-primary/15 font-semibold text-primary hover:bg-primary/20 data-[active=true]:bg-primary/15 data-[active=true]:text-primary"
                              : "",
                          )}
                        >
                          {Icon && (
                            <Icon
                              aria-hidden="true"
                              className={cn(
                                "size-4 shrink-0",
                                active && theme
                                  ? theme.dot
                                  : "text-muted-foreground",
                              )}
                            />
                          )}
                          <span className="truncate">{pos.name}</span>
                          <span
                            className={cn(
                              "ml-auto text-xs tabular-nums",
                              active ? "text-primary" : "text-muted-foreground",
                            )}
                          >
                            {pos.count}
                          </span>
                        </SidebarMenuButton>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <SidebarMenuAction showOnHover>
                                <MoreHorizontal />
                                <span className="sr-only">操作</span>
                              </SidebarMenuAction>
                            }
                          />
                          <DropdownMenuContent side="right" align="start">
                            <DropdownMenuGroup>
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() =>
                                  setDeleteTarget({
                                    deptId: dept.id,
                                    posId: pos.id,
                                    posName: pos.name,
                                  })
                                }
                              >
                                <Trash2 />
                                削除
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
      </Sidebar>

      {addDialogDept && (
        <AddItemDialog
          open={addDialogDeptId !== null}
          onOpenChange={(open) => {
            if (!open) setAddDialogDeptId(null);
          }}
          title="項目を追加"
          description={`${addDialogDept.name} に新しい項目を追加します`}
          fieldLabel="項目名"
          fieldId="pos-name"
          placeholder="例: 大学同期"
          onAdd={(name) => onAddPosition(addDialogDept.id, name)}
        />
      )}

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="この項目を削除しますか？"
        itemName={deleteTarget?.posName ?? ""}
        onConfirm={() => {
          if (deleteTarget) {
            onDeletePosition(deleteTarget.deptId, deleteTarget.posId);
            setDeleteTarget(null);
          }
        }}
      />
    </>
  );
}
