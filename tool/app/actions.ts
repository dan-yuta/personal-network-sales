"use server";

import { revalidatePath } from "next/cache";
import {
  setCandidateArchived,
  updateCandidateAxisScores,
  updateCandidateProfile,
  updateCandidateStage,
} from "@/lib/notion/candidates";
import {
  addContactLog,
  listContactLogsForCandidate,
} from "@/lib/notion/contact-logs";
import type { ContactMethod, NotionContactLog } from "@/lib/notion/schema";
import type { AxisScores, Profile, StageKey } from "@/lib/schema";

/**
 * クライアント（"use client" の Workspace 配下）から呼ぶ Server Action 群。
 *
 * - 実データアクセスは lib/notion/*（server-only）に委譲し、ここは薄いラッパー。
 * - 各 action 後に revalidatePath("/") で Server Component(page.tsx) の
 *   Notion 再フェッチをトリガする（クライアントは楽観的更新で即時反映済み）。
 * - 失敗時は例外がそのまま呼び出し側に伝播し、クライアントでロールバック＋トースト。
 */

export async function updateStageAction(
  pageId: string,
  stage: StageKey,
): Promise<void> {
  await updateCandidateStage(pageId, stage);
  revalidatePath("/");
}

export async function updateProfileAction(
  pageId: string,
  patch: Partial<Profile>,
): Promise<void> {
  await updateCandidateProfile(pageId, patch);
  revalidatePath("/");
}

export async function updateAxisScoresAction(
  pageId: string,
  axis: AxisScores,
): Promise<void> {
  await updateCandidateAxisScores(pageId, axis);
  revalidatePath("/");
}

export async function setArchivedAction(
  pageId: string,
  archived: boolean,
): Promise<void> {
  await setCandidateArchived(pageId, archived);
  revalidatePath("/");
}

/**
 * 候補者の接触ログを Notion から取得（新→旧）。Pane4 接触ログタブが
 * 候補者切替時に呼ぶ読み取り専用アクション。revalidate は不要。
 */
export async function listContactLogsAction(
  candidateId: string,
): Promise<NotionContactLog[]> {
  return listContactLogsForCandidate(candidateId);
}

export async function addContactLogAction(params: {
  candidateId: string;
  date: string;
  method: ContactMethod;
  content: string;
  nextAction?: string;
  nextActionDate?: string;
}): Promise<void> {
  await addContactLog(params);
  revalidatePath("/");
}
