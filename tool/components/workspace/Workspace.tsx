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

import {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useDeferredValue,
} from "react";

import {
  type AxisKey,
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
import {
  createMinimalProfile,
  createMinimalScorecard,
} from "@/lib/data/factories";
import { getLastContactDate } from "@/lib/data/mockLogs";
import { getCandidateAverageScore } from "@/lib/computed/scorecards";
import { normalizeForSearch } from "@/lib/computed/searchNormalize";
import { ARCHIVED_GROUP_LABEL, STAGE_LABELS } from "@/lib/labels";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { GlobalHeader } from "@/components/workspace/GlobalHeader";
import { PositionPane } from "@/components/workspace/PositionPane";
import { CandidateListPane } from "@/components/workspace/CandidateListPane";
import { CandidateDashboardPane } from "@/components/workspace/CandidateDashboardPane";
import { CandidateDetailPane } from "@/components/workspace/CandidateDetailPane";
import { ShortcutsHelpDialog } from "@/components/workspace/ShortcutsHelpDialog";
import { ToasterProvider, useToast } from "@/components/workspace/Toaster";

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

/**
 * Workspace 公開エントリ。ToasterProvider で包んでから WorkspaceContent を描画。
 * useToast() は Provider の内側でしか使えないため、Provider 配下の別関数として
 * 中身を切り出す必要がある (Workspace 自身が Provider と useToast を兼ねると
 * `useContext` が null になる)。
 */
export function Workspace(props: WorkspaceProps) {
  return (
    <ToasterProvider>
      <WorkspaceContent {...props} />
    </ToasterProvider>
  );
}

function WorkspaceContent({
  initialDepartments,
  initialCandidates,
  workspace,
}: WorkspaceProps) {
  const { push: pushToast } = useToast();
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
  // Pane 3「現時点評価」「営業条件」カードの開閉。100 人運用では「営業条件だけ
  // 見たい」「評価だけ見たい」のように、ユーザーごとに見たい情報が異なる。
  // 候補者切替では状態を維持する (個人の癖を保持)。
  const [evaluationOpen, setEvaluationOpen] = useState(true);
  const [recruitingConditionsOpen, setRecruitingConditionsOpen] =
    useState(true);
  // Pane 2 ステージグループの開閉状態。100 人運用では「未連絡・アプローチが
  // 大量で他ステージが埋もれる」シナリオが起こりうるため、ステージごとに畳める
  // ようにする (Pane3 のカードと同じ思想)。デフォルトは全 open。
  const [stageOpenMap, setStageOpenMap] = useState<Record<StageKey, boolean>>(
    () => ({
      screening: true,
      first: true,
      referral: true,
      second: true,
      final: true,
      lost: true,
      held: true,
    }),
  );
  const setStageOpen = useCallback((stage: StageKey, open: boolean) => {
    setStageOpenMap((prev) => ({ ...prev, [stage]: open }));
  }, []);
  // Pane 2 候補者リストのソートキー。SortKey 型は lib/schema.ts に集約。
  //   - deadline: 次回アクション日が近い順 (デフォルト、営業ツールのテンポに合う)
  //   - score: 平均スコア降順 (注力候補から見たいとき)
  //   - name: 氏名昇順 (五十音順で探したいとき)
  // 空欄日付は末尾、null スコアも末尾扱い。
  const [sortKey, setSortKey] = useState<SortKey>("deadline");
  // Pane 2 候補者の名前/接触経路/メモ でのフリーテキスト検索。空文字なら全表示。
  const [searchQuery, setSearchQuery] = useState<string>("");
  // useDeferredValue で 100 件 ×4 ペインの再計算をタイピングから 1 tick 後ろにずらす。
  // input 自体は最新値で表示し続けるので体感の遅延ゼロ、リストだけが追随する。
  const deferredSearchQuery = useDeferredValue(searchQuery);
  // 検索対象範囲。100 人規模では「全部マッチ」だと意図しないヒットが
  // 邪魔をするので、ユーザーが対象を絞れるようにする。
  const [searchScope, setSearchScope] = useState<SearchScope>("all");
  // ショートカット `?` でヘルプダイアログを開く
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false);
  // Pane2 検索 input への ref。`/` キーでフォーカスを当てるために
  // CandidateListPane に渡して内部の <input> に attach させる。
  const searchInputRef = useRef<HTMLInputElement>(null);

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
  //
  // 重要: Pane3 の InlineTextField は uncontrolled (defaultValue + onBlur 保存) なので、
  // 編集中のまま candidate を切り替えると Pane3 が `key={selectedCandidateId}` で
  // remount し、blur イベントが発火する前に input が消滅 → タイプ中の文字が失われる。
  // 100 人規模で「ABCさん編集中に XYZさんへ切替」が頻発する運用シナリオでデータロス
  // 事故になるため、切替前に明示的に活性要素を blur して保存経路を通す。
  const selectCandidate = useCallback((id: string) => {
    if (
      typeof document !== "undefined" &&
      document.activeElement instanceof HTMLElement
    ) {
      document.activeElement.blur();
    }
    setSelectedCandidateId(id);
    setApplicationInfoOpen(false);
    setPane4ManuallyClosed(false);
  }, []);

  const addCandidate = useCallback((stage: StageKey, name: string) => {
    // crypto.randomUUID は SSR Node 19+ / 全モダンブラウザで利用可能。
    // 旧 `c-${Date.now()}` は同一ミリ秒で衝突する (100 件まとめて import する
    // シナリオで現実的に起こりうる) ため UUID に置き換え。
    const newId = `c-${crypto.randomUUID()}`;
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
  // Undo (= restoreCandidate) 用にトースト発火。
  //
  // 設計メモ: setCandidates の reducer 関数内で setSelectedCandidateId を呼ぶ
  // のは「副作用なしの純関数」原則からは外れるが、純粋に id を計算するだけで
  // idempotent (同じ id を 2 回 set しても結果同じ) なので React 19 StrictMode
  // の二重呼び出しでも安全。「archive 後の最新 candidates から fallback を取る」
  // ロジックを setCandidates の外に置くと、古い candidates クロージャを参照する
  // バグが入るため、ネスト形を意識的に維持する。
  const archiveCandidate = useCallback(
    (id: string) => {
      // Undo のため、現在の archived 状態を撮影する (元々アーカイブ済の人を
      // 再 archive する操作は no-op なので、操作前に archived フラグだけ
      // 覚えておけば「元に戻す」で正しい状態に戻せる)。
      const target = candidates.find((c) => c.id === id);
      const previousArchived = target?.archived ?? false;
      const name = target?.profile.name || "候補者";

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

      // 既にアーカイブ済の場合はトースト出さない (UI 上は通常起こらないが防御)
      if (!previousArchived) {
        pushToast({
          message: `${name} をアーカイブしました`,
          undo: () => {
            setCandidates((prev) =>
              prev.map((c) =>
                c.id === id ? { ...c, archived: false } : c,
              ),
            );
            setSelectedCandidateId(id);
          },
        });
      }
    },
    [candidates, pushToast],
  );

  // アーカイブ済み候補者を元のステージに復元する。`stage` は archived 中も保持
  // しているので、そのステージへ戻すだけでよい。Undo で再アーカイブ。
  const restoreCandidate = useCallback(
    (id: string) => {
      const target = candidates.find((c) => c.id === id);
      const previousArchived = target?.archived ?? false;
      const name = target?.profile.name || "候補者";

      setCandidates((prev) =>
        prev.map((c) => (c.id === id ? { ...c, archived: false } : c)),
      );

      if (previousArchived) {
        pushToast({
          message: `${name} を復元しました`,
          undo: () => {
            setCandidates((prev) =>
              prev.map((c) => (c.id === id ? { ...c, archived: true } : c)),
            );
          },
        });
      }
    },
    [candidates, pushToast],
  );

  // 4 軸スコアの 1 つを更新する。Pane3「現時点評価」カードでユーザーが
  // 星アイコンをクリックしたとき呼ばれる。
  //
  // 仕様 (UI/UX 観点で「重い操作」を作らないことを優先):
  //   - 既存の **最新 done scorecard** があれば、その axisScores を上書き
  //     (履歴は残さない、現時点評価の即時更新)
  //   - done scorecard が無ければ、最小 scorecard を新規追加して
  //     クリックした軸だけ値を設定 (factory 経由)
  //   - value === null は「リセット」(未評価に戻す)。scorecard そのものは
  //     消さない (= 評価開始マーカーは残す)
  //
  // Pane2 ScoreBadge の平均値は派生計算 (getCandidateAverageScore) なので、
  // この更新だけで全箇所が自動追従する。
  const setAxisScore = useCallback(
    (candidateId: string, axisKey: AxisKey, value: number | null) => {
      setCandidates((prev) =>
        prev.map((c) => {
          if (c.id !== candidateId) return c;

          // 末尾から「done」scorecard を探す (getLatestDoneScorecard と同じ
          // ロジック、ただしインデックスが欲しいのでここで再実装)
          let latestDoneIdx = -1;
          for (let i = c.scorecards.length - 1; i >= 0; i--) {
            const sc = c.scorecards[i];
            // deriveStageStatus と同等: decision が truthy なら done
            if (sc.decision && sc.decision.trim() !== "") {
              latestDoneIdx = i;
              break;
            }
          }

          if (latestDoneIdx >= 0) {
            // 既存 scorecard の軸スコアを上書き
            const target = c.scorecards[latestDoneIdx];
            const updated = {
              ...target,
              axisScores: { ...target.axisScores, [axisKey]: value },
            };
            const nextScorecards = [...c.scorecards];
            nextScorecards[latestDoneIdx] = updated;
            return { ...c, scorecards: nextScorecards };
          }

          // 新規 scorecard を追加 (リセット時は無意味なので no-op)
          if (value === null) return c;
          const newScorecard = createMinimalScorecard(c.stage, {
            key: axisKey,
            value,
          });
          return { ...c, scorecards: [...c.scorecards, newScorecard] };
        }),
      );
    },
    [],
  );

  // 候補者を別ステージへ移動 / 同ステージ内で並び替え。
  //
  // `toStage` は移動先のステージキー。`toIndex` はそのステージグループ内での
  // 0-origin の挿入位置。配列順を SSoT としているため、candidates 配列上の
  // 絶対インデックスに変換して `splice` 相当の挿入を行う。
  //
  // 同ステージ内ドラッグ・別ステージへのドラッグの両方をこの 1 関数で扱う。
  // archived 候補者は対象外（DnD はアクティブな候補者のみ可能）。
  //
  // ステージが変わったときだけ Undo トーストを出す (同ステージ内の並び替えは
  // 軽い操作で「戻す」ことへの心理的需要が低い + 連続並び替えで通知が
  // 邪魔になる)。Undo は元の (stage, indexInStage) を撮影して戻す。
  const moveCandidate = useCallback(
    (id: string, toStage: StageKey, toIndex: number) => {
      const subject = candidates.find((c) => c.id === id);
      if (!subject || subject.archived) {
        // archive 済みは DnD 対象外 / 不明 id も no-op
        return;
      }
      const fromStage = subject.stage;
      // 元のステージ内インデックスを計算 (Undo で同じ位置に戻すため)
      let fromIndex = 0;
      for (const c of candidates) {
        if (c.id === id) break;
        if (!c.archived && c.stage === fromStage) fromIndex++;
      }

      setCandidates((prev) => {
        const subjectIndex = prev.findIndex((c) => c.id === id);
        if (subjectIndex < 0) return prev;
        const sub = prev[subjectIndex];
        if (sub.archived) return prev;

        const without = prev.filter((_, i) => i !== subjectIndex);
        const updated: Candidate = { ...sub, stage: toStage };

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

      // ステージ跨ぎのときだけトースト
      if (fromStage !== toStage) {
        const fromLabel = STAGE_LABELS[fromStage];
        const toLabel = STAGE_LABELS[toStage];
        const name = subject.profile.name || "候補者";
        pushToast({
          message: `${name} を「${fromLabel}」→「${toLabel}」に移動`,
          undo: () => {
            // 同じ moveCandidate ロジックを直接実行 (再帰呼び出しは
            // 「Undo のための Undo トースト」を出してしまうので避け、
            // setCandidates だけ直接呼ぶ)
            setCandidates((prev) => {
              const subjectIndex = prev.findIndex((c) => c.id === id);
              if (subjectIndex < 0) return prev;
              const sub = prev[subjectIndex];
              const without = prev.filter((_, i) => i !== subjectIndex);
              const reverted: Candidate = { ...sub, stage: fromStage };
              let count = 0;
              let absInsertAt = without.length;
              for (let i = 0; i < without.length; i++) {
                const c = without[i];
                if (!c.archived && c.stage === fromStage) {
                  if (count === fromIndex) {
                    absInsertAt = i;
                    break;
                  }
                  count++;
                }
              }
              return [
                ...without.slice(0, absInsertAt),
                reverted,
                ...without.slice(absInsertAt),
              ];
            });
          },
        });
      }
    },
    [candidates, pushToast],
  );

  const addDepartment = useCallback((name: string) => {
    // crypto.randomUUID で同一ミリ秒衝突 (連続追加) を避ける。
    setDepartments((prev) => [
      ...prev,
      { id: `d-${crypto.randomUUID()}`, name, positions: [] },
    ]);
  }, []);

  const deleteDepartment = useCallback(
    (deptId: string) => {
      // Undo 用に削除前の (dept, index) を撮影
      const idx = departments.findIndex((d) => d.id === deptId);
      if (idx < 0) return;
      const removed = departments[idx];
      setDepartments((prev) => prev.filter((d) => d.id !== deptId));
      pushToast({
        message: `カテゴリ「${removed.name}」を削除しました`,
        undo: () => {
          setDepartments((prev) => {
            // 同 id が既に復元されていれば no-op (連打防御)
            if (prev.some((d) => d.id === deptId)) return prev;
            const next = [...prev];
            // 元の位置に挿入 (位置が prev.length 超過なら末尾)
            const insertAt = Math.min(idx, next.length);
            next.splice(insertAt, 0, removed);
            return next;
          });
        },
      });
    },
    [departments, pushToast],
  );

  const addPosition = useCallback((deptId: string, posName: string) => {
    // crypto.randomUUID で同一ミリ秒衝突を避ける (addCandidate / addDepartment と統一)
    setDepartments((prev) =>
      prev.map((d) =>
        d.id === deptId
          ? {
              ...d,
              positions: [
                ...d.positions,
                { id: `p-${crypto.randomUUID()}`, name: posName, count: 0 },
              ],
            }
          : d,
      ),
    );
  }, []);

  const deletePosition = useCallback(
    (deptId: string, posId: string) => {
      // Undo 用に削除前の (position, indexInDept) を撮影
      const dept = departments.find((d) => d.id === deptId);
      if (!dept) return;
      const posIdx = dept.positions.findIndex((p) => p.id === posId);
      if (posIdx < 0) return;
      const removed = dept.positions[posIdx];

      setDepartments((prev) =>
        prev.map((d) =>
          d.id === deptId
            ? { ...d, positions: d.positions.filter((p) => p.id !== posId) }
            : d,
        ),
      );
      pushToast({
        message: `ステージ「${removed.name}」を削除しました`,
        undo: () => {
          setDepartments((prev) =>
            prev.map((d) => {
              if (d.id !== deptId) return d;
              if (d.positions.some((p) => p.id === posId)) return d; // 連打防御
              const nextPositions = [...d.positions];
              const insertAt = Math.min(posIdx, nextPositions.length);
              nextPositions.splice(insertAt, 0, removed);
              return { ...d, positions: nextPositions };
            }),
          );
        },
      });
    },
    [departments, pushToast],
  );

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
  // この派生計算で上書きする (archived は除外、7種類すべて集計)。
  // c.stage の型は StageKey なので includes チェックは不要だが、念のため。
  const stageCountMap = useMemo(() => {
    const map: Record<StageKey, number> = {
      screening: 0,
      first: 0,
      referral: 0,
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

    // Intl.Collator を一度だけ生成 (毎比較で new するより高速)。
    // ロケール ja で五十音順 + sensitivity base で大文字小文字無視。
    const collator = new Intl.Collator("ja", { sensitivity: "base" });

    // ソート関数。null/空欄値は末尾扱いになるよう、sentinel 値を当てる。
    // Notion 取り込み等で多数の候補者が furigana 空欄になる現実シナリオで、
    // 「漢字 charcode 順と五十音順が混在」する崩壊を防ぐため、furigana 空欄は
    // ソート末尾にまとめる (グループ化 → そのグループ内は name 漢字順)。
    const compareFn = (a: Candidate, b: Candidate): number => {
      if (sortKey === "name") {
        const aHasFurigana = a.profile.furigana.length > 0;
        const bHasFurigana = b.profile.furigana.length > 0;
        if (aHasFurigana !== bHasFurigana) {
          // フリガナあり = 先、フリガナなし = 末尾
          return aHasFurigana ? -1 : 1;
        }
        if (aHasFurigana) {
          return collator.compare(a.profile.furigana, b.profile.furigana);
        }
        // 両方フリガナなし → name (kanji) で順序を安定化 (charcode 順だが
        // 「未設定グループ内での順序」なのでユーザー体感の混乱は最小)
        return collator.compare(a.profile.name, b.profile.name);
      }
      if (sortKey === "priority") {
        // 優先度ソート: 高 (1) → 中 (2) → 低 (3) → 未設定 (4)
        // 同 priority は furigana 順 (fallback name 順) で tie-break。
        const order = { high: 1, medium: 2, low: 3, "": 4 } as const;
        const pa = order[a.profile.priority];
        const pb = order[b.profile.priority];
        if (pa !== pb) return pa - pb;
        return collator.compare(
          a.profile.furigana || a.profile.name,
          b.profile.furigana || b.profile.name,
        );
      }
      if (sortKey === "score") {
        // 未評価 (null) は末尾。同点は furigana 順で安定化 (tie-break)。
        const sa = getCandidateAverageScore(a);
        const sb = getCandidateAverageScore(b);
        if (sa === null && sb === null) {
          return collator.compare(
            a.profile.furigana || a.profile.name,
            b.profile.furigana || b.profile.name,
          );
        }
        if (sa === null) return 1;
        if (sb === null) return -1;
        if (sa !== sb) return sb - sa; // 降順
        return collator.compare(
          a.profile.furigana || a.profile.name,
          b.profile.furigana || b.profile.name,
        );
      }
      // sortKey === "deadline": 次回アクション日が近い順 (空欄は末尾)。
      // sentinel "9999-12-31" は文字列順 = 日付順が成立する正規日付。
      // 同日は furigana 順で tie-break。
      const da = a.profile.availableStartDate || "9999-12-31";
      const db = b.profile.availableStartDate || "9999-12-31";
      if (da !== db) return da.localeCompare(db);
      return collator.compare(
        a.profile.furigana || a.profile.name,
        b.profile.furigana || b.profile.name,
      );
    };

    // フリーテキスト検索フィルタ: searchScope で対象範囲を切替。
    // 部分一致。空クエリなら素通り。
    //   - all:    名前 (kanji + furigana) + 接触経路 + メモ (キャリア + 動機)
    //   - name:   名前のみ (kanji + furigana)
    //   - source: 接触経路のみ
    //   - memo:   キャリア + 動機メモ
    //
    // 正規化: normalizeForSearch で NFKC + lowercase + カタカナ→ひらがな。
    // 「タナカ」「たなか」「ＴＡＮＡＫＡ」「tanaka」を全て同一視する。
    // 空白区切りの複数キーワードは AND 検索 (全 token が含まれる行のみヒット)。
    const tokens = normalizeForSearch(deferredSearchQuery)
      .split(/\s+/)
      .filter((t) => t.length > 0);
    const matchSearch = (c: Candidate) => {
      if (tokens.length === 0) return true;
      const p = c.profile;
      const nameField = normalizeForSearch(`${p.name} ${p.furigana}`);
      const sourceField = normalizeForSearch(p.source);
      const memoField = normalizeForSearch(`${p.careerText} ${p.motivationFull}`);
      const haystack =
        searchScope === "name"
          ? nameField
          : searchScope === "source"
            ? sourceField
            : searchScope === "memo"
              ? memoField
              : `${nameField} ${sourceField} ${memoField}`;
      return tokens.every((t) => haystack.includes(t));
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
          lastContactDate: getLastContactDate(c.id),
          priority: c.profile.priority,
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
        lastContactDate: getLastContactDate(c.id),
        priority: c.profile.priority,
      }));

    if (archivedItems.length === 0) return stageGroups;
    return [
      ...stageGroups,
      { kind: "archived" as const, label: ARCHIVED_GROUP_LABEL, items: archivedItems },
    ];
  }, [candidates, selectedStage, sortKey, deferredSearchQuery, searchScope]);

  // フィルタ後の可視 ID 集合と総ヒット件数。
  //   - 可視 ID 集合: 「選択中候補者がフィルタから外れているか」判定に使う
  //   - 総ヒット件数: Pane2 の「該当 0 件」空状態の判定に使う
  const visibleCandidateIds = useMemo(() => {
    const set = new Set<string>();
    for (const g of candidateGroups) {
      for (const item of g.items) set.add(item.id);
    }
    return set;
  }, [candidateGroups]);
  const totalVisibleCount = visibleCandidateIds.size;
  const selectedCandidateVisible = visibleCandidateIds.has(selectedCandidateId);

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
  // - 1〜6 でステージ絞り込み (同じキーで解除)、Esc で絞り込み + 検索をリセット
  // - ↑ / k で前の候補者、↓ / j で次の候補者 (現在表示中の flat list を巡回)
  // - / で Pane2 検索 input にフォーカス
  // - ? (Shift+/) でショートカットヘルプを開く
  //
  // 注意: 候補者切替のハンドラは visibleCandidateIds (Set) に依存するので
  // deps に含める必要がある (古い閉包だと並び替え後に巡回がズレる)。
  // STAGE_ORDER / selectCandidate は immutable / stable callback なので OK。
  useEffect(() => {
    // flat list を作る (Pane2 の表示順 = candidateGroups の順 = 並び順)
    const flatIds: string[] = [];
    for (const g of candidateGroups) {
      for (const item of g.items) flatIds.push(item.id);
    }

    const handler = (e: KeyboardEvent) => {
      // IME 変換中は素通り (日本語入力中の数字確定で誤発火しないように)。
      // isComposing は Chrome/Safari/Firefox の最新版で動く、keyCode 229 は
      // 旧 Edge / IE のフォールバック。
      if (e.isComposing || e.keyCode === 229) return;

      const target = e.target as HTMLElement | null;
      // ダイアログ / メニュー / ポップオーバー (Calendar 等) 内にフォーカスがある
      // 状態を別判定する。Esc は本来「ダイアログ系を閉じる」操作のため、ここでは
      // 素通りさせ、絞り込み解除のような副作用を出さない。
      // Base UI の Popup 系は role 属性が必ず付くわけではない (Menu/Popover) ので、
      // shadcn/ui の data-slot 属性 (dialog-content / dropdown-menu-content /
      // popover-content) で識別する。listbox / combobox は role で検出。
      const inDialogOrMenu =
        !!target &&
        (!!target.closest('[role="dialog"]') ||
          !!target.closest('[role="menu"]') ||
          !!target.closest('[role="listbox"]') ||
          !!target.closest('[data-slot="dialog-content"]') ||
          !!target.closest('[data-slot="dropdown-menu-content"]') ||
          !!target.closest('[data-slot="dropdown-menu-sub-content"]') ||
          !!target.closest('[data-slot="popover-content"]'));
      const inEditable =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable ||
          // Base UI の Combobox は role 属性で識別
          !!target.closest('[role="combobox"]') ||
          inDialogOrMenu);

      // Escape は入力欄からも効くようにする (検索欄に居ても全解除できる)
      // ただし「ダイアログ / メニューを閉じる」操作とは衝突させない: dialog/menu
      // 内の Esc は Base UI 側のクローズに任せ、絞り込み解除など余計な副作用を
      // 起こさない (連打や複合操作で「閉じたつもりが検索もクリア」を防ぐ)。
      // shortcuts ヘルプを開いた状態の Esc も同様に素通り。
      if (e.key === "Escape") {
        if (inDialogOrMenu || shortcutsHelpOpen) return;
        setSelectedStage(null);
        setSearchQuery("");
        // input にフォーカスがあれば外す (UX: 「終わった」感を出す)
        if (
          inEditable &&
          target instanceof HTMLElement &&
          typeof target.blur === "function"
        ) {
          target.blur();
        }
        e.preventDefault();
        return;
      }

      // 入力欄では他のショートカットは素通り
      if (inEditable) return;
      // 修飾キー付き (Cmd+1 等) はブラウザのタブ切替なので素通り
      // ただし ? は Shift+/ なので shiftKey は許容する
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // ヘルプ: `?` (Shift+/) で開く。? は e.key の文字表現で来る。
      if (e.key === "?") {
        setShortcutsHelpOpen((v) => !v);
        e.preventDefault();
        return;
      }

      // 検索フォーカス: `/`
      if (e.key === "/") {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        e.preventDefault();
        return;
      }

      // 候補者切替: ↑/k = 前、↓/j = 次
      if (e.key === "ArrowDown" || e.key === "j") {
        if (flatIds.length === 0) return;
        const cur = flatIds.indexOf(selectedCandidateId);
        // 未選択 (cur=-1) or 末尾なら、先頭に巡回しない方が混乱が少ない:
        // 末尾 → 先頭にラップせず、末尾でクランプする。
        // (Gmail も「次のメール」は末尾でクランプ)
        const next = cur < 0 ? 0 : Math.min(cur + 1, flatIds.length - 1);
        if (next !== cur) selectCandidate(flatIds[next]);
        e.preventDefault();
        return;
      }
      if (e.key === "ArrowUp" || e.key === "k") {
        if (flatIds.length === 0) return;
        const cur = flatIds.indexOf(selectedCandidateId);
        // 未選択 / 先頭は no-op (先頭でクランプ)
        const next = cur < 0 ? 0 : Math.max(cur - 1, 0);
        if (next !== cur) selectCandidate(flatIds[next]);
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
  }, [candidateGroups, selectedCandidateId, selectCandidate, shortcutsHelpOpen]);

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
          onOpenShortcutsHelp={() => setShortcutsHelpOpen(true)}
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
            totalVisibleCount={totalVisibleCount}
            searchInputRef={searchInputRef}
            stageOpenMap={stageOpenMap}
            onStageOpenChange={setStageOpen}
          />
          <CandidateDashboardPane
            profile={profile}
            scorecards={scorecards}
            stage={activeCandidate.stage}
            setProfile={setProfile}
            applicationInfoOpen={applicationInfoOpen}
            onApplicationInfoOpenChange={setApplicationInfoOpen}
            evaluationOpen={evaluationOpen}
            onEvaluationOpenChange={setEvaluationOpen}
            onSetAxisScore={(axisKey, value) =>
              setAxisScore(selectedCandidateId, axisKey, value)
            }
            recruitingConditionsOpen={recruitingConditionsOpen}
            onRecruitingConditionsOpenChange={setRecruitingConditionsOpen}
            selectedCandidateId={selectedCandidateId}
            onChangeStage={(next) =>
              moveCandidate(selectedCandidateId, next, 0)
            }
            hiddenByFilter={!selectedCandidateVisible}
            onClearFiltersForSelected={() => {
              setSelectedStage(null);
              setSearchQuery("");
            }}
          />
          <CandidateDetailPane
            candidate={activeCandidate}
            pane4Open={pane4Open}
            onTogglePane4={togglePane4}
          />
        </div>
      </SidebarInset>
      <ShortcutsHelpDialog
        open={shortcutsHelpOpen}
        onOpenChange={setShortcutsHelpOpen}
      />
    </SidebarProvider>
  );
}
