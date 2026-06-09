"use client";

import { useEffect, useRef, useState, useMemo, type RefObject } from "react";
import {
  Archive,
  ArchiveRestore,
  ArrowUpDown,
  ChevronDown,
  Inbox,
  MoreHorizontal,
  MoveDown,
  Plus,
  Search,
  Star,
  X,
} from "lucide-react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
  type ScreenReaderInstructions,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { cn } from "@/lib/utils";
import {
  type CandidateRow,
  type Group,
  type StageKey,
  type SortKey,
  type SearchScope,
  SORT_KEYS,
  SEARCH_SCOPES,
} from "@/lib/schema";
import { tokenizeQuery } from "@/lib/computed/searchHighlight";
import { DeleteConfirmDialog } from "@/components/workspace/DeleteConfirmDialog";
import { HighlightedText } from "@/components/workspace/HighlightedText";
import { SortableCandidateRow } from "@/components/workspace/SortableCandidateRow";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AddItemDialog } from "@/components/workspace/AddItemDialog";
import { STAGE_LABELS, STAGE_THEME } from "@/lib/labels";
import { getScoreColorClass } from "@/lib/computed/scoreColor";

// dnd-kit のスクリーンリーダー向け日本語化。
const screenReaderInstructions: ScreenReaderInstructions = {
  draggable:
    "Space または Enter で候補者を持ち上げ、矢印キーで移動、Space で確定、Esc でキャンセルします。",
};

/**
 * SortKey の日本語表示ラベル。SortKey 型は lib/schema.ts に集約済みなので
 * import して使う。ここではドロップダウンの表示文字列のみを保持。
 */
const SORT_LABELS: Record<SortKey, string> = {
  deadline: "次回アクション日順",
  score: "スコア順 (高 → 低)",
  name: "名前順 (五十音)",
  priority: "優先度順 (高 → 中 → 低)",
};

/**
 * SearchScope の日本語表示ラベル + プレースホルダ。検索バーの placeholder と
 * スコープ切替ドロップダウンの両方で使う。
 *   - all: 既定値。フィールドを問わず広く拾う
 *   - 個別 scope: 「接触経路だけで絞り込みたい」など意図が明確なときに使う
 */
const SEARCH_SCOPE_LABELS: Record<SearchScope, string> = {
  all: "全部",
  name: "名前",
  source: "接触経路",
  memo: "メモ",
};
// Pane2 (280px 幅) 内のスコープ chip + 検索 input は実効幅が ~180px しかない。
// text-xs でも 15 文字以上は truncate されるため、プレースホルダは短く保つ。
// 詳細 (どのフィールドが対象か) は aria-label と chip 表示で代替する。
const SEARCH_SCOPE_PLACEHOLDERS: Record<SearchScope, string> = {
  all: "キーワードで検索",
  name: "名前で検索",
  source: "接触経路で検索",
  memo: "メモで検索",
};

type CandidateListPaneProps = {
  groups: Group[];
  selectedCandidateId: string;
  onSelectCandidate: (id: string) => void;
  onAddCandidate: (stage: StageKey, name: string) => void;
  onArchiveCandidate: (id: string) => void;
  onRestoreCandidate: (id: string) => void;
  onMoveCandidate: (id: string, toStage: StageKey, toIndex: number) => void;
  /** 現在絞り込み中のステージ名。undefined なら絞り込みなし (全候補者表示) */
  filteredStageLabel?: string;
  /** 絞り込み解除ボタンのハンドラ。filteredStageLabel が指定されたときに呼ばれる */
  onClearFilter?: () => void;
  /** Pane2 候補者リストのソートキー (Workspace 側で管理) */
  sortKey: SortKey;
  /** ソートキー変更ハンドラ */
  onSortKeyChange: (key: SortKey) => void;
  /** 候補者の名前/接触経路/メモでのフリーテキスト検索クエリ */
  searchQuery: string;
  /** 検索クエリ変更ハンドラ */
  onSearchQueryChange: (q: string) => void;
  /** 検索対象範囲 (全部/名前/接触経路/メモ) */
  searchScope: SearchScope;
  /** 検索対象範囲変更ハンドラ */
  onSearchScopeChange: (scope: SearchScope) => void;
  /** 検索 + ステージ絞り込み適用後に表示される候補者の総数 (アーカイブ含む)。
   *  0 件のとき「該当する候補者が見つかりません」空状態を出すために使う。 */
  totalVisibleCount: number;
  /** Pane2 検索 input への ref。Workspace 側で `/` キー押下時に
   *  `searchInputRef.current?.focus()` してフォーカスを当てるために使う。 */
  searchInputRef?: RefObject<HTMLInputElement | null>;
  /** ステージグループの開閉状態 (Workspace で保持、候補者切替でも維持)。 */
  stageOpenMap: Record<StageKey, boolean>;
  /** ステージグループの開閉トグルハンドラ */
  onStageOpenChange: (stage: StageKey, open: boolean) => void;
};

export function CandidateListPane({
  groups,
  selectedCandidateId,
  onSelectCandidate,
  onAddCandidate,
  onArchiveCandidate,
  onRestoreCandidate,
  onMoveCandidate,
  filteredStageLabel,
  onClearFilter,
  sortKey,
  onSortKeyChange,
  searchQuery,
  onSearchQueryChange,
  searchScope,
  onSearchScopeChange,
  totalVisibleCount,
  searchInputRef,
  stageOpenMap,
  onStageOpenChange,
}: CandidateListPaneProps) {
  const [addDialogStage, setAddDialogStage] = useState<{
    stage: StageKey;
    label: string;
  } | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // 初回マウント時、選択中（Cookie で復元した前回の人）の行を表示範囲に入れる。
  // ページ再読み込みで Pane2 が先頭に戻り「前回見ていた人」が画面外になるのを防ぐ。
  // block:"nearest" なので既に見えていれば動かさない（不要なジャンプなし）。
  // 初回一度きり（didInitialScrollRef）。以降の選択変更ではスクロールを強制しない。
  const rootRef = useRef<HTMLElement>(null);
  const didInitialScrollRef = useRef(false);
  useEffect(() => {
    if (didInitialScrollRef.current || !selectedCandidateId) return;
    const el = rootRef.current?.querySelector(
      `[data-candidate-id="${CSS.escape(selectedCandidateId)}"]`,
    );
    if (el) {
      el.scrollIntoView({ block: "nearest" });
      didInitialScrollRef.current = true;
    }
  }, [selectedCandidateId]);

  // PointerSensor の distance 制約で「クリック」と「ドラッグ」を区別する
  // （6px 以上動かさないとドラッグ起動しない → 行クリック / メニュー操作と衝突しない）。
  // KeyboardSensor は Tab 移動 → Space で持ち上げ → 矢印で移動 → Enter で確定。
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const stageGroups = groups.filter(
    (g): g is Extract<Group, { kind: "stage" }> => g.kind === "stage",
  );
  const archivedGroup = groups.find(
    (g): g is Extract<Group, { kind: "archived" }> => g.kind === "archived",
  );

  // 検索ヒット箇所のハイライト用 tokens。空配列なら hightlight しない。
  // searchQuery 変化のたびに再生成だが、子コンポーネントには「変化しないなら
  // 参照を維持する」useMemo で渡し、リスト全行の再レンダを抑制する。
  const searchTokens = useMemo(
    () => tokenizeQuery(searchQuery),
    [searchQuery],
  );

  // ドラッグ中の浮遊行表示用に元データを引く
  const activeDragRow: { row: CandidateRow; stage: StageKey } | null = (() => {
    if (!activeDragId) return null;
    for (const g of stageGroups) {
      const row = g.items.find((r) => r.id === activeDragId);
      if (row) return { row, stage: g.stage };
    }
    return null;
  })();

  const announcements: Announcements = {
    onDragStart: ({ active }) => {
      const name = (active.data.current?.name as string | undefined) ?? "候補者";
      return `${name}を持ち上げました。`;
    },
    onDragOver: ({ active, over }) => {
      const name = (active.data.current?.name as string | undefined) ?? "候補者";
      if (!over) return `${name}を移動中です。`;
      const overContainer = over.data.current?.containerId as
        | StageKey
        | undefined;
      if (overContainer)
        return `${name}を「${STAGE_LABELS[overContainer]}」の上に移動しました。`;
      return `${name}を移動中です。`;
    },
    onDragEnd: ({ active, over }) => {
      const name = (active.data.current?.name as string | undefined) ?? "候補者";
      if (!over) return `${name}の移動をキャンセルしました。`;
      const overContainer =
        (over.data.current?.containerId as StageKey | undefined) ??
        (typeof over.id === "string" &&
        stageGroups.some((g) => g.stage === over.id)
          ? (over.id as StageKey)
          : undefined);
      if (!overContainer) return `${name}を確定しました。`;
      return `${name}を「${STAGE_LABELS[overContainer]}」に移動しました。`;
    },
    onDragCancel: ({ active }) => {
      const name = (active.data.current?.name as string | undefined) ?? "候補者";
      return `${name}の移動をキャンセルしました。`;
    },
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    if (!over) return;

    const activeContainer = active.data.current?.containerId as
      | StageKey
      | undefined;
    // over の所属コンテナは、要素ドロップなら data.current.containerId、
    // SortableContext そのものへのドロップなら over.id（= "stage" のキー）。
    const overContainer =
      (over.data.current?.containerId as StageKey | undefined) ??
      (typeof over.id === "string" &&
      stageGroups.some((g) => g.stage === over.id)
        ? (over.id as StageKey)
        : undefined);

    if (!activeContainer || !overContainer) return;

    const targetGroup = stageGroups.find((g) => g.stage === overContainer);
    if (!targetGroup) return;

    let toIndex: number;
    if (active.id === over.id) return;

    const overIndexInTarget = targetGroup.items.findIndex(
      (r) => r.id === over.id,
    );
    if (overIndexInTarget >= 0) {
      // 同コンテナ内: active を一旦取り除いた後の index を保つため、
      // active が同コンテナ内で over より前にあれば overIndexInTarget はそのまま、
      // 後ろなら -1 ずれる、という自然な算出になる。Workspace.moveCandidate 側で
      // active を除いた配列上で挿入するため、ここでは単純に over の現 index を渡す。
      toIndex = overIndexInTarget;
    } else {
      // 空コンテナ・末尾領域へのドロップ: 末尾に追加
      toIndex = targetGroup.items.length;
    }

    onMoveCandidate(String(active.id), overContainer, toIndex);
  };

  return (
    <section
      ref={rootRef}
      className="flex w-[280px] shrink-0 flex-col border-r border-border bg-background"
    >
      <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border px-3">
        <h2 className="truncate text-sm font-semibold text-foreground">
          営業候補リスト
        </h2>
        <div className="flex shrink-0 items-center gap-1">
          {filteredStageLabel && onClearFilter && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClearFilter}
              className="h-7 shrink-0 gap-1 px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={`${filteredStageLabel} の絞り込みを解除して全候補者を表示`}
            >
              <X aria-hidden="true" className="size-3.5" />
              <span>{filteredStageLabel} を解除</span>
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={`並び順を変更 (現在: ${SORT_LABELS[sortKey]})`}
                  title={`並び順: ${SORT_LABELS[sortKey]}`}
                >
                  <ArrowUpDown className="size-4" aria-hidden="true" />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                {SORT_KEYS.map((key) => (
                  <DropdownMenuItem
                    key={key}
                    onClick={() => onSortKeyChange(key)}
                    className={cn(sortKey === key && "font-semibold text-primary")}
                  >
                    {/* 常時 size-3 の inline-flex を出して幅を揃え、選択中行と
                        未選択行の左インデントを統一する (UX レビュー指摘) */}
                    <span
                      aria-hidden="true"
                      className="inline-flex size-3 items-center justify-center text-primary"
                    >
                      {sortKey === key ? "●" : ""}
                    </span>
                    <span>{SORT_LABELS[key]}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* 検索バー: スコープ chip + フリーテキスト入力。
          100 人規模では「全部マッチ」だと意図しないヒットが邪魔をするため、
          スコープを明示的に選べる UI を入れる (チップ部分タップでドロップダウン)。 */}
      <div className="border-b border-border px-3 py-2">
        <div className="flex items-stretch gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-input bg-background px-2 text-xs text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                  aria-label={`検索対象: ${SEARCH_SCOPE_LABELS[searchScope]} (クリックで変更)`}
                  title={`検索対象: ${SEARCH_SCOPE_LABELS[searchScope]}`}
                >
                  <span>{SEARCH_SCOPE_LABELS[searchScope]}</span>
                  <ChevronDown aria-hidden="true" className="size-3 opacity-60" />
                </button>
              }
            />
            <DropdownMenuContent align="start">
              <DropdownMenuGroup>
                {SEARCH_SCOPES.map((scope) => (
                  <DropdownMenuItem
                    key={scope}
                    onClick={() => onSearchScopeChange(scope)}
                    className={cn(
                      searchScope === scope && "font-semibold text-primary",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="inline-flex size-3 items-center justify-center text-primary"
                    >
                      {searchScope === scope ? "●" : ""}
                    </span>
                    <span>{SEARCH_SCOPE_LABELS[scope]}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="relative min-w-0 flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground"
            />
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder={SEARCH_SCOPE_PLACEHOLDERS[searchScope]}
              aria-label={`${SEARCH_SCOPE_LABELS[searchScope]} で候補者を検索 (/ キーでフォーカス)`}
              // ネイティブの × クリアボタン (Chrome/Edge/Safari) を非表示にする。
              // 自前の × ボタン (右側) と二重表示になる問題への対処。
              // type="search" は Esc キーでクリア等のセマンティクスを保つため維持。
              className="w-full rounded-md border border-input bg-background py-1.5 pr-7 pl-7 text-xs outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchQueryChange("")}
                aria-label="検索クリア"
                className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X aria-hidden="true" className="size-3" />
              </button>
            )}
          </div>
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <DndContext
          // 固定 id を渡して SSR/CSR 間の `aria-describedby` 採番ズレ
          // （DndDescribedBy-N の連番）による hydration mismatch を回避する
          id="pane2-candidate-dnd"
          sensors={sensors}
          collisionDetection={closestCenter}
          accessibility={{ announcements, screenReaderInstructions }}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveDragId(null)}
        >
          <div className="flex flex-col gap-5 px-3 py-4">
            {/* 検索 + ステージ絞り込み適用後に 1 件もヒットしないとき、
                各ステージのドロップ用 placeholder だけが並んで「全員消えた!?」と
                誤認させるため、専用空状態で「該当なし」を明示する。
                ステージ絞り込みのみで全 0 はあまり起きない (空ステージは普通に表示)
                ので、searchQuery がある場合のみ検索由来として扱う。 */}
            {totalVisibleCount === 0 && searchQuery.trim().length > 0 ? (
              <div
                className="flex flex-col items-center gap-2 px-4 py-12 text-center text-xs text-muted-foreground"
                role="status"
                aria-live="polite"
              >
                <Search aria-hidden="true" className="size-6 opacity-40" />
                <p>
                  「
                  <span className="font-semibold text-foreground">
                    {searchQuery.trim()}
                  </span>
                  」に該当する候補者がいません
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onSearchQueryChange("")}
                  className="h-7 gap-1 px-2 text-xs"
                >
                  <X aria-hidden="true" className="size-3.5" />
                  検索をクリア
                </Button>
              </div>
            ) : (
              <>
                {stageGroups.map((group) => (
                  <StageGroup
                    key={`stage:${group.stage}`}
                    stage={group.stage}
                    label={group.label}
                    items={group.items}
                    selectedCandidateId={selectedCandidateId}
                    onSelectCandidate={onSelectCandidate}
                    onAddRequest={() =>
                      setAddDialogStage({
                        stage: group.stage,
                        label: group.label,
                      })
                    }
                    onArchiveRequest={(id, name) =>
                      setArchiveTarget({ id, name })
                    }
                    searchActive={searchQuery.trim().length > 0}
                    searchTokens={searchTokens}
                    open={stageOpenMap[group.stage]}
                    onOpenChange={(open) =>
                      onStageOpenChange(group.stage, open)
                    }
                  />
                ))}
                {archivedGroup && (
                  <ArchivedGroup
                    label={archivedGroup.label}
                    items={archivedGroup.items}
                    open={archivedOpen}
                    onOpenChange={setArchivedOpen}
                    selectedCandidateId={selectedCandidateId}
                    onSelectCandidate={onSelectCandidate}
                    onRestore={onRestoreCandidate}
                    searchTokens={searchTokens}
                  />
                )}
              </>
            )}
          </div>
          <DragOverlay>
            {activeDragRow && (
              <div className="flex items-center gap-2 rounded-md bg-accent px-2.5 py-2.5 text-accent-foreground shadow-lg">
                <Avatar className="size-8 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                    {activeDragRow.row.name[0] ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{activeDragRow.row.name}</p>
                </div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </ScrollArea>

      {addDialogStage && (
        <AddItemDialog
          open={addDialogStage !== null}
          onOpenChange={(open) => {
            if (!open) setAddDialogStage(null);
          }}
          title="営業候補を追加"
          description={`「${addDialogStage.label}」ステージに営業候補を追加します`}
          fieldLabel="氏名"
          fieldId="candidate-name"
          placeholder="例: 山田 太郎"
          onAdd={(name) => onAddCandidate(addDialogStage.stage, name)}
        />
      )}

      <DeleteConfirmDialog
        open={archiveTarget !== null}
        onOpenChange={(open) => {
          if (!open) setArchiveTarget(null);
        }}
        title="営業候補をアーカイブしますか？"
        itemName={archiveTarget?.name ?? ""}
        description={`「${archiveTarget?.name ?? ""}」をアーカイブします。後で「アーカイブ済み」から復元できます。`}
        actionLabel="アーカイブ"
        onConfirm={() => {
          if (archiveTarget) {
            onArchiveCandidate(archiveTarget.id);
            setArchiveTarget(null);
          }
        }}
      />
    </section>
  );
}

function StageGroup({
  stage,
  label,
  items,
  selectedCandidateId,
  onSelectCandidate,
  onAddRequest,
  onArchiveRequest,
  searchActive,
  searchTokens,
  open,
  onOpenChange,
}: {
  stage: StageKey;
  label: string;
  items: CandidateRow[];
  selectedCandidateId: string;
  onSelectCandidate: (id: string) => void;
  onAddRequest: () => void;
  onArchiveRequest: (id: string, name: string) => void;
  /** 検索クエリが入力されているか。空ステージの「(ここへドラッグで追加)」を
   *  抑制するために使う (検索中はドラッグ元の候補者が見えていない可能性が
   *  高く、ドラッグ追加の文言が文脈外でノイズになる)。 */
  searchActive: boolean;
  /** 検索ハイライト用 tokens (CandidateListPane で生成して引き継ぎ) */
  searchTokens: readonly string[];
  /** ステージグループの開閉 (Workspace の stageOpenMap で保持) */
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  // 空ステージでもドロップを受け取れるようにする（最後の 1 名を別ステージへ
  // 動かした後の戻し先を保つため、ステージは常時表示）。
  // SortableContext id (= stage) は要素の並び替え用、useDroppable id は
  // 「コンテナ自体」の drop ターゲット用。両者を分けることで衝突を避ける。
  const { setNodeRef, isOver } = useDroppable({
    id: `dropzone:${stage}`,
    data: { containerId: stage },
  });

  // dnd-kit は items 配列の identity 変化で内部の collision detection 用 indexing
  // を rebuild するため、毎レンダ `items.map((i) => i.id)` だと 100 件 × 6 ステージで
  // タイプ毎にコストがかかる。items の参照が変わったときだけ id 配列を作り直す。
  const itemIds = useMemo(() => items.map((i) => i.id), [items]);

  const theme = STAGE_THEME[stage];

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      {/* sticky group header: 左は親 px-3 を打ち消して viewport 端まで色を伸ばすが、
          右側は ScrollArea の縦スクロールバー (w-2.5 = 10px) と被らないよう、
          親 px-3 (= 12px) ぶんの右マージン分を残す。`-ml-3 mr-0` で右だけ
          parent content boundary に揃え、スクロールバーは色のないガター扱いに。 */}
      <CollapsibleTrigger
        nativeButton={false}
        render={
          <div
            className={cn(
              "group/stage-trigger sticky top-0 z-10 -ml-3 mb-2 flex cursor-pointer items-center justify-between gap-2 px-5 py-1.5 outline-none",
              "focus-visible:ring-3 focus-visible:ring-ring/50",
              theme.bg,
            )}
          />
        }
      >
        <div className="flex min-w-0 items-center gap-1.5">
          {/* ApplicationInfoCard / ArchivedGroup と同じ向き (閉: ↓ → 開: ↑) */}
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "size-3.5 shrink-0 transition-[color,transform] in-data-[panel-open]:rotate-180",
              theme.text,
            )}
          />
          <span
            aria-hidden="true"
            className={cn("size-2 shrink-0 rounded-full bg-current", theme.dot)}
          />
          <h3 className={cn("truncate text-xs font-semibold", theme.text)}>
            {label}
          </h3>
          <Badge size="xs" className={cn("border-0 bg-background/60", theme.text)}>
            {items.length}
          </Badge>
        </div>
        {/* 「+ 追加」ボタンはトリガー領域内に置きつつ、クリックで親 (Collapsible)
            のトグルが発火しないよう stopPropagation する。 */}
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={(e) => {
            e.stopPropagation();
            onAddRequest();
          }}
          aria-label={`${label} に候補者を追加`}
          className="text-muted-foreground hover:text-foreground"
        >
          <Plus aria-hidden="true" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
      <SortableContext
        id={stage}
        items={itemIds}
        strategy={verticalListSortingStrategy}
      >
        <ul
          ref={setNodeRef}
          data-stage={stage}
          className={cn(
            "flex flex-col gap-1",
            items.length === 0 && "min-h-12 rounded-md border border-dashed border-border/70 p-2",
            items.length === 0 && isOver && "border-primary/60 bg-primary/5",
          )}
        >
          {items.length === 0 ? (
            <li
              className={cn(
                "pointer-events-none flex h-10 items-center justify-center gap-1.5 text-xs",
                isOver ? "text-primary" : "text-muted-foreground",
              )}
              aria-hidden="true"
            >
              {isOver ? (
                <>
                  <MoveDown className="size-3.5" aria-hidden="true" />
                  <span>ここに移動</span>
                </>
              ) : (
                <>
                  <Inbox className="size-3.5" aria-hidden="true" />
                  {/* 検索中はドラッグ元の候補者が他ステージで見えていない
                      可能性があるため、ドラッグ追加の文言を抑制。 */}
                  <span>
                    候補者がいません
                    {!searchActive && " (ここへドラッグで追加)"}
                  </span>
                </>
              )}
            </li>
          ) : (
            items.map((cand) => (
              <SortableCandidateRow
                key={cand.id}
                cand={cand}
                stage={stage}
                selected={cand.id === selectedCandidateId}
                onSelect={onSelectCandidate}
                searchTokens={searchTokens}
                actions={
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => onArchiveRequest(cand.id, cand.name)}
                  >
                    <Archive />
                    アーカイブ
                  </DropdownMenuItem>
                }
              />
            ))
          )}
        </ul>
      </SortableContext>
      </CollapsibleContent>
    </Collapsible>
  );
}

function ArchivedGroup({
  label,
  items,
  open,
  onOpenChange,
  selectedCandidateId,
  onSelectCandidate,
  onRestore,
  searchTokens,
}: {
  label: string;
  items: CandidateRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCandidateId: string;
  onSelectCandidate: (id: string) => void;
  onRestore: (id: string) => void;
  searchTokens: readonly string[];
}) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger
        nativeButton={false}
        render={
          <div
            className={cn(
              // StageGroup と同じく、右側はスクロールバーを避けるため
              // `-ml-3` のみ (右マージンなし)。
              "group/archived-trigger sticky top-0 z-10 -ml-3 mb-2 flex cursor-pointer items-center justify-between gap-2 bg-background px-5 py-1.5",
              "rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            )}
          />
        }
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <h3 className="truncate text-xs font-medium text-muted-foreground">
            {label}
          </h3>
          <Badge variant="secondary" size="xs">
            {items.length}
          </Badge>
        </div>
        <ChevronDown
          aria-hidden="true"
          className="size-4 text-muted-foreground transition-[color,transform] group-hover/archived-trigger:text-foreground in-data-[panel-open]:rotate-180"
        />
        <span className="sr-only">{`${label}を開く`}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="flex flex-col gap-1" data-stage="archived">
          {items.map((cand) => (
            <ArchivedRowItem
              key={cand.id}
              cand={cand}
              selected={cand.id === selectedCandidateId}
              onSelect={onSelectCandidate}
              onRestore={onRestore}
              searchTokens={searchTokens}
            />
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

function ArchivedRowItem({
  cand,
  selected,
  onSelect,
  onRestore,
  searchTokens,
}: {
  cand: CandidateRow;
  selected: boolean;
  onSelect: (id: string) => void;
  onRestore: (id: string) => void;
  searchTokens: readonly string[];
}) {
  return (
    <li className="group/candidate relative">
      <button
        type="button"
        onClick={() => onSelect(cand.id)}
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-2.5 py-2.5 text-left transition-colors",
          "outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          selected
            ? "bg-accent text-accent-foreground"
            : "text-foreground hover:bg-muted",
        )}
      >
        <Avatar className="size-8 shrink-0">
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
            {cand.name[0] ?? "?"}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">
            <HighlightedText text={cand.name} tokens={searchTokens} />
          </p>
        </div>
        <span className="transition-opacity group-focus-within/candidate:opacity-0 group-hover/candidate:opacity-0">
          <ScoreBadge avg={cand.averageScore} selected={selected} />
        </span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className={cn(
                "absolute top-1/2 right-1 -translate-y-1/2",
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
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => onRestore(cand.id)}>
              <ArchiveRestore />
              復元
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

// アーカイブ済み行用のスコアバッジ。SortableCandidateRow 側の ScoreBadge と
// 同じ色付けポリシー (selected による色変えはしない)。
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
