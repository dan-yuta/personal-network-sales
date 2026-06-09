import { cookies } from "next/headers";
import { Workspace } from "@/components/workspace/Workspace";
import positionsData from "@/data/positions.json";
import workspaceData from "@/data/workspace.json";
import { departmentsSchema, workspaceSchema } from "@/lib/schema";
import { listCandidates } from "@/lib/notion/candidates";
import { SELECTED_CANDIDATE_COOKIE } from "@/lib/selection";

// 毎リクエストで Notion から最新を取得（静的プリレンダーさせない）。
// 課題の核心が「別端末でリロードしても同じ最新データ」なので、ビルド時
// 焼き込み＋キャッシュ無効化のタイミング依存を避け、常に動的取得にする。
// (各 Server Action 内の revalidatePath は二重の保険として残置。)
export const dynamic = "force-dynamic";

// Server Component。候補者は Notion（データソース）から取得する。
// ステージ定義(positions.json)・アプリ設定(workspace.json)はリポジトリの
// マスタ定義のまま（編集対象ではないのでDBに置かない＝保存先ハイブリッド）。
export default async function Page() {
  const deptResult = departmentsSchema.safeParse(positionsData);
  const wsResult = workspaceSchema.safeParse(workspaceData);
  const candidates = await listCandidates();

  // 前回選択していた候補者を Cookie から復元（SSR 時点で初期選択を確定し、
  // クライアント側の差し替えによるちらつきを防ぐ）。実在しない（別DB由来・
  // 削除済み）ID は無視して null（=既定選択）にフォールバックする。
  const cookieStore = await cookies();
  const storedId = cookieStore.get(SELECTED_CANDIDATE_COOKIE)?.value ?? null;
  const initialSelectedCandidateId =
    storedId && candidates.some((c) => c.id === storedId) ? storedId : null;

  if (!deptResult.success || !wsResult.success) {
    const errors = [
      !deptResult.success &&
        `positions.json: ${deptResult.error.issues[0]?.message}`,
      !wsResult.success &&
        `workspace.json: ${wsResult.error.issues[0]?.message}`,
    ].filter(Boolean);
    throw new Error(`データの形式が正しくありません:\n${errors.join("\n")}`);
  }

  return (
    <>
      <Workspace
        initialDepartments={deptResult.data}
        initialCandidates={candidates}
        initialSelectedCandidateId={initialSelectedCandidateId}
        workspace={wsResult.data}
      />
      {/*
        Pane2 のスクロール復元（ちらつき防止）。
        本文の後ろに置いた同期インラインスクリプトは、ブラウザが Pane2 を
        「先頭」で初回描画する前（HTML パース中）に実行される。選択中
        （Cookie で復元した前回の人）の行 data-selected="true" を探して
        scrollIntoView するため、最初の描画時点で既に対象者の位置になり、
        「一瞬先頭 → スクロール」のフラッシュが原理的に起きない。
        useEffect だと SSR 先頭描画→JS 後スクロールで一瞬先頭が見えてしまう。
      */}
      <script
        dangerouslySetInnerHTML={{
          __html:
            "(function(){try{var e=document.querySelector('[data-candidate-id][data-selected]');if(e){e.scrollIntoView({block:'nearest'});}}catch(_){}})();",
        }}
      />
    </>
  );
}
