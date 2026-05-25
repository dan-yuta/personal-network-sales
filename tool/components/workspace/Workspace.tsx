"use client";

/**
 * Workspace: 4 ペインの親コンポーネント。
 *
 * - Pane 1〜4 の state（candidates / selectedCandidateId / selectedDetail）を
 *   保持し、各ペインに props として渡す。
 *   `previousDetail` state は ADR-0011 §6 大決定 D で削除した（戻り先が候詳に固定
 *   されたため、直前の詳細を 1 段階覚える概念が不要になった）。
 * - Pane 3 = 候補者ダッシュボード（人物軸の編集: ヘッダー + 候補者情報 + 営業条件）
 * - Pane 4 = 次の一手領域（接触ログ / 連絡文作成のタブ切替、常時開きが基本動線）
 *
 * レイアウト構造（shadcn/ui Sidebar を採用、ADR-0006 §3/§5 を本実装で改訂）:
 *
 * ```
 * <SidebarProvider> (h-screen, defaultOpen, Cmd+B でトグル)
 * ┌─ Sidebar (Pane 1) ─┬─ SidebarInset ─────────────────────┐
 * │ (画面最上端          │ ┌─ GlobalHeader (h-12) ─────────┐ │
 * │  〜最下端)           │ └─────────────────────────────────┘ │
 * │ collapsible="icon"  │ ┌─ Pane 2 ─┬─ Pane 3 ─┬─ Pane 4 ─┐ │
 * │ 240px ↔ 48px        │ │          │          │          │ │
 * └────────────────────┴─┴──────────┴──────────┴──────────┘
 * ```
 *
 * - Pane 1 のみ画面最上端〜最下端まで届く chrome（折りたたみ可）
 * - GlobalHeader は Pane 1 を除く右側全幅（Pane 2 / Pane 3 / Pane 4 の上）に渡る
 * - Pane 4 はヘッダー直下から最下端まで
 * - Pane 1 折りたたみトグルは Pane 1 ヘッダー右端の `Pane1Toggle` 1 箇所
 *   （ADR-0006 §5 で計画していた GlobalHeader 側の SidebarTrigger は本実装で撤回）
 *
 * 仕様の出典:
 *   - openspec/decision/0006-pane-background-hierarchy-and-shadcn-inset-header.md
 *     §2（4 段階背景色階層）/ §4（保存ステータス削除）はそのまま採用
 *     §3（Pane 4 = 画面最上端〜最下端 / ヘッダーは中央エリアのみ）は本実装で再改訂
 *     §5（SidebarTrigger は GlobalHeader）も本実装で再改訂（Pane 1 ヘッダー側に集約）
 *   - openspec/decision/0009-drilldown-card-affordance.md（Pane 3 ドリルダウンカードの ▶ 規律）
 *   - openspec/changes/add-4pane-workspace-template/specs/workspace-template/spec.md
 *   - openspec/changes/add-4pane-workspace-template/design.md D51〜D56 / D65
 */

import { useState, useCallback, useEffect, useMemo } from "react";

import {
  type Profile,
  type StageKey,
  type Department,
  type Candidate,
  type Group,
  type SortKey,
  type SearchScope,
  STAGE_ORDER,
  isStageKey,
} from "@/lib/schema";
import { createMinimalProfile } from "@/lib/data/factories";
import { getCandidateAverageScore } from "@/lib/computed/scorecards";
import { ARCHIVED_GROUP_LABEL, STAGE_LABELS } from "@/lib/labels";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { GlobalHeader } from "@/components/workspace/GlobalHeader";
import { PositionPane } from "@/components/workspace/PositionPane";
import { CandidateListPane } from "@/components/workspace/CandidateListPane";
import { CandidateDashboardPane } from "@/components/workspace/CandidateDashboardPane";
import { CandidateDetailPane } from "@/components/workspace/CandidateDetailPane";

// ========== UI 内部型 ==========
//
// 種データは `data/*.json` → Server Component（app/page.tsx）で Zod parse → props で受け取る。
// ヘルパー関数（createMinimalProfile）は `lib/data/factories.ts`。
// Pane 2 の表示用派生型 (CandidateRow / Group) は `lib/schema.ts` に集約（複数ペインで共有するため）。

type WorkspaceProps = {
  initialDepartments: Department[];
  initialCandidates: Candidate[];
  workspace: { name: string; icon: string };
};

export function Workspace({
  initialDepartments,
  initialCandidates,
  workspace,
}: WorkspaceProps) {
  const [departments, setDepartments] =
    useState<Department[]>(initialDepartments);
  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>("c2");
  // 営業ツール用: Pane1 で選択中のステージ。null = 全候補者を表示。
  // positions.json の position.id が "stage-{StageKey}" の形式なので、それを基に判定する。
  const [selectedStage, setSelectedStage] = useState<StageKey | null>(null);
  // ユーザーが手動で Pane 4 を畳んだか。
  const [pane4ManuallyClosed, setPane4ManuallyClosed] = useState(false);
  // Pane 3「候補者情報」カード（Collapsible）の開閉。候補者切替で閉じ、新規追加で開く。
  const [applicationInfoOpen, setApplicationInfoOpen] = useState(false);
  // Pane 2 候補者リストのソートキー。SortKey 型は lib/schema.ts に集約。
  //   - deadline: 次回アクション日が近い順 (デフォルト、営業ツールのテンポに合う)
  //   - score: 平均スコア降順 (注力候補から見たいとき)
  //   - name: 氏名昇順 (五十音順で探したいとき)
  // 空欄日付は末尾、null スコアも末尾扱い。
  const [sortKey, setSortKey] = useState<SortKey>("deadline");
  // Pane 2 候補者の名前/接触経路/メモ でのフリーテキスト検索。空文字なら全表示。
  const [searchQuery, setSearchQuery] = useState<string>("");
  // 検索対象範囲。100 人規模では「全部マッチ」だと意図しないヒットが
  // 邪魔をするので、ユーザーが対象を絞れるようにする。
  const [searchScope, setSearchScope] = useState<SearchScope>("all");

  // Pane 4 の展開状態。営業ツールでは Pane4 が「常に開いている」のが基本動線
  // （接触ログ・連絡文作成タブの操作領域として）。
  // ユーザーが手動で畳めば閉じる、というシンプルな制御に変更。
  const pane4Open = !pane4ManuallyClosed;

  // アクティブ候補者を取得。candidates が常に最低 1 名持つ前提だが、
  // 万一 find が undefined を返す（未来に candidates の削除機能が入った場合等）
  // ケースに備えて先頭候補者にフォールバックする。
  const activeCandidate =
    candidates.find((c) => c.id === selectedCandidateId) ?? candidates[0];
  const profile = activeCandidate.profile;
  const scorecards = activeCandidate.scorecards;

  // CandidateDashboardPane の編集 UI は `setProfile: React.Dispatch<React.SetStateAction<Profile>>`
  // を期待している。子コンポーネント側の signature を変えないために、
  // candidates 配列を更新するアダプタをここで作る。
  // 関数形 (p => next) と値形 (next) の両方に対応する。
  const setProfile = useCallback<React.Dispatch<React.SetStateAction<Profile>>>(
    (action) => {
      setCandidates((prev) =>
        prev.map((c) => {
          if (c.id !== selectedCandidateId) return c;
          const next =
            typeof action === "function" ? action(c.profile) : action;
          return { ...c, profile: next };
        }),
      );
    },
    [selectedCandidateId],
  );

  // Pane 2 の候補者行クリックでアクティブ候補者を切り替える。
  const selectCandidate = useCallback((id: string) => {
    setSelectedCandidateId(id);
    setApplicationInfoOpen(false);
    setPane4ManuallyClosed(false);
  }, []);

  const addCandidate = useCallback((stage: StageKey, name: string) => {
    const newId = `c-${Date.now()}`;
    const newCandidate: Candidate = {
      id: newId,
      profile: createMinimalProfile(name),
      scorecards: [],
      stage,
      archived: false,
    };
    setCandidates((prev) => [...prev, newCandidate]);
    setSelectedCandidateId(newId);
    setApplicationInfoOpen(true);
    setPane4ManuallyClosed(false);
  }, []);

  // 候補者をアーカイブ（論理削除）する。データは残し `archived: true` を立てる。
  // アクティブ候補者をアーカイブした場合は、非 archived の先頭候補者にフォールバック。
  //
  // 設計メモ: setCandidates の reducer 関数内で setSelectedCandidateId を呼ぶ
  // のは「副作用なしの純関数」原則からは外れるが、純粋に id を計算するだけで
  // idempotent (同じ id を 2 回 set しても結果同じ) なので React 19 StrictMode
  // の二重呼び出しでも安全。「archive 後の最新 candidates から fallback を取る」
  // ロジックを setCandidates の外に置くと、古い candidates クロージャを参照する
  // バグが入るため、ネスト形を意識的に維持する。
  const archiveCandidate = useCallback((id: string) => {
    setCandidates((prev) => {
      const next = prev.map((c) =>
        c.id === id ? { ...c, archived: true } : c,
      );
      setSelectedCandidateId((prevId) => {
        if (prevId !== id) return prevId;
        const fallback = next.find((c) => !c.archived);
        return fallback ? fallback.id : "";
      });
      return next;
    });
    setPane4ManuallyClosed(false);
  }, []);

  // アーカイブ済み候補者を元のステージに復元する。`stage` は archived 中も保持
  // しているので、そのステージへ戻すだけでよい。
  const restoreCandidate = useCallback((id: string) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, archived: false } : c)),
    );
  }, []);

  // 候補者を別ステージへ移動 / 同ステージ内で並び替え。
  //
  // `toStage` は移動先のステージキー。`toIndex` はそのステージグループ内での
  // 0-origin の挿入位置。配列順を SSoT としているため、candidates 配列上の
  // 絶対インデックスに変換して `splice` 相当の挿入を行う。
  //
  // 同ステージ内ドラッグ・別ステージへのドラッグの両方をこの 1 関数で扱う。
  // archived 候補者は対象外（DnD はアクティブな候補者のみ可能）。
  const moveCandidate = useCallback(
    (id: string, toStage: StageKey, toIndex: number) => {
      setCandidates((prev) => {
        const subjectIndex = prev.findIndex((c) => c.id === id);
        if (subjectIndex < 0) return prev;
        const subject = prev[subjectIndex];
        if (subject.archived) return prev;

        const without = prev.filter((_, i) => i !== subjectIndex);
        const updated: Candidate = { ...subject, stage: toStage };

        let count = 0;
        let absInsertAt = without.length;
        for (let i = 0; i < without.length; i++) {
          const c = without[i];
          if (!c.archived && c.stage === toStage) {
            if (count === toIndex) {
              absInsertAt = i;
              break;
            }
            count++;
          }
        }
        return [
          ...without.slice(0, absInsertAt),
          updated,
          ...without.slice(absInsertAt),
        ];
      });
    },
    [],
  );

  const addDepartment = useCallback((name: string) => {
    setDepartments((prev) => [
      ...prev,
      { id: `d-${Date.now()}`, name, positions: [] },
    ]);
  }, []);

  const deleteDepartment = useCallback((deptId: string) => {
    setDepartments((prev) => prev.filter((d) => d.id !== deptId));
  }, []);

  const addPosition = useCallback((deptId: string, posName: string) => {
    setDepartments((prev) =>
      prev.map((d) =>
        d.id === deptId
          ? {
              ...d,
              positions: [
                ...d.positions,
                { id: `p-${Date.now()}`, name: posName, count: 0 },
              ],
            }
          : d,
      ),
    );
  }, []);

  const deletePosition = useCallback((deptId: string, posId: string) => {
    setDepartments((prev) =>
      prev.map((d) =>
        d.id === deptId
          ? { ...d, positions: d.positions.filter((p) => p.id !== posId) }
          : d,
      ),
    );
  }, []);

  // Pane 4 の開閉トグル。
  const togglePane4 = useCallback(() => setPane4ManuallyClosed((v) => !v), []);

  // 営業候補リスト用: Pane1 のステージタブ選択状態を breadcrumb に反映。
  // selectedStage が null のときは「全候補者」、ステージ選択中は STAGE_LABELS から派生。
  const positionTitle = selectedStage
    ? STAGE_LABELS[selectedStage]
    : "全候補者";
  const departmentTitle = "営業ステージ";

  // Pane1 ステージタブの件数バッジを candidates から動的派生する。
  // positions.json の count はハードコード値なので、実データとズレないよう
  // この派生計算で上書きする (archived は除外、6種類すべて集計)。
  // c.stage の型は StageKey なので includes チェックは不要だが、念のため。
  const stageCountMap = useMemo(() => {
    const map: Record<StageKey, number> = {
      screening: 0,
      first: 0,
      second: 0,
      final: 0,
      lost: 0,
      held: 0,
    };
    for (const c of candidates) {
      if (!c.archived) {
        map[c.stage]++;
      }
    }
    return map;
  }, [candidates]);

  // departments の position.count を派生値で上書きしたものを PositionPane に渡す。
  // 想定外の id (Phase 3 でユーザー定義カテゴリを許容する場合等) はそのまま。
  const departmentsWithLiveCount = useMemo(() => {
    return departments.map((dept) => ({
      ...dept,
      positions: dept.positions.map((pos) => {
        if (!pos.id.startsWith("stage-")) return pos;
        const key = pos.id.slice("stage-".length);
        if (isStageKey(key)) {
          return { ...pos, count: stageCountMap[key] };
        }
        return pos;
      }),
    }));
  }, [departments, stageCountMap]);

  const candidateGroups: Group[] = useMemo(() => {
    // 営業ツール用: selectedStage が null なら全ステージを表示、
    // ステージ選択中はそのステージだけに絞り込む（Pane1 タブクリックでフィルタ）。
    const visibleStages = selectedStage
      ? STAGE_ORDER.filter((s) => s === selectedStage)
      : STAGE_ORDER;

    // ソート関数。null/空欄値は末尾扱いになるよう、Infinity 相当の値を当てる。
    const compareFn = (a: Candidate, b: Candidate): number => {
      if (sortKey === "name") {
        // フリガナ優先で五十音順ソート、空なら name で fallback。
        // (漢字 charcode 順だと「中島・中村」より「林・藤田」が後ろにくる
        //  ような非五十音順になるので、必ず furigana を入れる運用が望ましい)
        const af = a.profile.furigana || a.profile.name;
        const bf = b.profile.furigana || b.profile.name;
        return af.localeCompare(bf, "ja");
      }
      if (sortKey === "score") {
        const sa = getCandidateAverageScore(a) ?? -1;
        const sb = getCandidateAverageScore(b) ?? -1;
        // 降順 (高いスコアが先頭)
        return sb - sa;
      }
      // sortKey === "deadline": 次回アクション日が近い順 (空欄は末尾)。
      // sentinel "9999-12-31" は文字列順 = 日付順が成立する正規日付。
      // (旧: "9999-99-99" は文字列ソートには使えるが Date 解釈不能で脆い)
      const da = a.profile.availableStartDate || "9999-12-31";
      const db = b.profile.availableStartDate || "9999-12-31";
      return da.localeCompare(db);
    };

    // フリーテキスト検索フィルタ: searchScope で対象範囲を切替。
    // 部分一致 (case insensitive)。空クエリなら素通り。
    // フリガナで「タナカ」検索 → 田中さんがヒット、漢字を打てなくてもOK。
    //   - all:    名前 (kanji + furigana) + 接触経路 + メモ (キャリア + 動機)
    //   - name:   名前のみ (kanji + furigana)
    //   - source: 接触経路のみ
    //   - memo:   キャリア + 動機メモ
    const q = searchQuery.trim().toLowerCase();
    const matchSearch = (c: Candidate) => {
      if (!q) return true;
      const p = c.profile;
      const nameHit =
        p.name.toLowerCase().includes(q) ||
        p.furigana.toLowerCase().includes(q);
      const sourceHit = p.source.toLowerCase().includes(q);
      const memoHit =
        p.careerText.toLowerCase().includes(q) ||
        p.motivationFull.toLowerCase().includes(q);
      switch (searchScope) {
        case "name":
          return nameHit;
        case "source":
          return sourceHit;
        case "memo":
          return memoHit;
        case "all":
        default:
          return nameHit || sourceHit || memoHit;
      }
    };

    const stageGroups: Group[] = visibleStages.map((stage) => ({
      kind: "stage" as const,
      stage,
      label: STAGE_LABELS[stage],
      items: candidates
        .filter((c) => !c.archived && c.stage === stage && matchSearch(c))
        .sort(compareFn)
        .map((c) => ({
          id: c.id,
          name: c.profile.name,
          averageScore: getCandidateAverageScore(c),
          nextActionDate: c.profile.availableStartDate,
          source: c.profile.source,
        })),
    }));

    // ステージ絞り込み中は archive 行も非表示（Pane1で選択中のステージに集中）。
    if (selectedStage !== null) return stageGroups;

    const archivedItems = candidates
      .filter((c) => c.archived && matchSearch(c))
      .sort(compareFn)
      .map((c) => ({
        id: c.id,
        name: c.profile.name,
        averageScore: getCandidateAverageScore(c),
        nextActionDate: c.profile.availableStartDate,
        source: c.profile.source,
      }));

    if (archivedItems.length === 0) return stageGroups;
    return [
      ...stageGroups,
      { kind: "archived" as const, label: ARCHIVED_GROUP_LABEL, items: archivedItems },
    ];
  }, [candidates, selectedStage, sortKey, searchQuery, searchScope]);

  // Pane1 のステージタブ（position.id = "stage-{StageKey}"）クリック時のハンドラ。
  // 同じステージを再クリックすると null (全表示) に戻る、というトグル動作にする。
  // 非ステージ ID (Phase 3 の独自カテゴリ用) は弾く。
  const handleSelectPosition = useCallback((positionId: string) => {
    if (!positionId.startsWith("stage-")) return;
    const key = positionId.slice("stage-".length);
    if (!isStageKey(key)) return;
    setSelectedStage((prev) => (prev === key ? null : key));
  }, []);

  // ===== キーボードショートカット =====
  // 1〜6 でステージ絞り込み (同じキーで解除)、Esc で絞り込み + 検索をリセット。
  //
  // 注意: deps を [] にできるのは、ハンドラが state を直接読まず setState の
  // 関数形 (prev) => ... のみを使っているため。stage に依存して
  // `setSelectedStage(stage)` のように値形を書く場合は必ず deps に追加する
  // (さもなくば閉包の古い値を参照する)。STAGE_ORDER は immutable なので OK。
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // IME 変換中は素通り (日本語入力中の数字確定で誤発火しないように)。
      // isComposing は Chrome/Safari/Firefox の最新版で動く、keyCode 229 は
      // 旧 Edge / IE のフォールバック。
      if (e.isComposing || e.keyCode === 229) return;

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable ||
          // Base UI の Combobox / Dialog は role 属性で識別
          target.closest('[role="combobox"]') ||
          target.closest('[role="dialog"]') ||
          target.closest('[role="menu"]'))
      ) {
        return;
      }
      // 修飾キー付き (Cmd+1 等) はブラウザのタブ切替なので素通り
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "Escape") {
        setSelectedStage(null);
        setSearchQuery("");
        e.preventDefault();
        return;
      }
      // 1-6 → STAGE_ORDER[0..5] にマッピング
      const num = Number.parseInt(e.key, 10);
      if (!Number.isNaN(num) && num >= 1 && num <= STAGE_ORDER.length) {
        const stage = STAGE_ORDER[num - 1];
        setSelectedStage((prev) => (prev === stage ? null : stage));
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    // shadcn/ui の SidebarProvider が外側を取り、Pane 1 (`<Sidebar>`) を全高で固定
    // 表示する。SidebarInset が右側ブロック（GlobalHeader + Pane 2/3/4）を担う。
    // Cmd+B のキーバインドは SidebarProvider 側で標準実装されている。
    // SidebarProvider のラッパー div は既定 `min-h-svh w-full`。雛形では
    // ビューポート高に固定したいので h-screen を併記し、ペイン内で min-h-0 が
    // 効くようにする（既存 ScrollArea の挙動と整合）。
    <SidebarProvider
      defaultOpen
      className="h-screen w-full overflow-hidden bg-background text-foreground"
    >
      <PositionPane
        workspaceName={workspace.name}
        departments={departmentsWithLiveCount}
        selectedPositionName={positionTitle}
        onAddPosition={addPosition}
        onDeletePosition={deletePosition}
        onSelectPosition={handleSelectPosition}
      />
      <SidebarInset className="flex min-w-0 flex-col bg-background">
        <GlobalHeader
          departmentTitle={departmentTitle}
          positionTitle={positionTitle}
          candidateName={profile.name}
          departments={departments}
          onAddDepartment={addDepartment}
          onDeleteDepartment={deleteDepartment}
        />
        {/* SidebarInset 自体が <main> を出すので、内側は <div> で組み、
            Pane 2 / Pane 3 / Pane 4 を横並びにする。 */}
        <div className="flex min-h-0 flex-1">
          <CandidateListPane
            groups={candidateGroups}
            selectedCandidateId={selectedCandidateId}
            onSelectCandidate={selectCandidate}
            onAddCandidate={addCandidate}
            onArchiveCandidate={archiveCandidate}
            onRestoreCandidate={restoreCandidate}
            onMoveCandidate={moveCandidate}
            filteredStageLabel={
              selectedStage ? STAGE_LABELS[selectedStage] : undefined
            }
            onClearFilter={() => setSelectedStage(null)}
            sortKey={sortKey}
            onSortKeyChange={setSortKey}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            searchScope={searchScope}
            onSearchScopeChange={setSearchScope}
          />
          <CandidateDashboardPane
            profile={profile}
            scorecards={scorecards}
            stage={activeCandidate.stage}
            setProfile={setProfile}
            applicationInfoOpen={applicationInfoOpen}
            onApplicationInfoOpenChange={setApplicationInfoOpen}
            selectedCandidateId={selectedCandidateId}
            onChangeStage={(next) =>
              moveCandidate(selectedCandidateId, next, 0)
            }
          />
          <CandidateDetailPane
            candidate={activeCandidate}
            pane4Open={pane4Open}
            onTogglePane4={togglePane4}
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
