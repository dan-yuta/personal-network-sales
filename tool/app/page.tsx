import { Workspace } from "@/components/workspace/Workspace";
import positionsData from "@/data/positions.json";
import workspaceData from "@/data/workspace.json";
import { departmentsSchema, workspaceSchema } from "@/lib/schema";
import { listCandidates } from "@/lib/notion/candidates";

// Server Component。候補者は Notion（データソース）から取得する。
// ステージ定義(positions.json)・アプリ設定(workspace.json)はリポジトリの
// マスタ定義のまま（編集対象ではないのでDBに置かない＝保存先ハイブリッド）。
export default async function Page() {
  const deptResult = departmentsSchema.safeParse(positionsData);
  const wsResult = workspaceSchema.safeParse(workspaceData);
  const candidates = await listCandidates();

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
    <Workspace
      initialDepartments={deptResult.data}
      initialCandidates={candidates}
      workspace={wsResult.data}
    />
  );
}
