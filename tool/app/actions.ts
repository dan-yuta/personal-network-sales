"use server";

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
 * - revalidatePath は呼ばない。クライアントが楽観的更新で即時反映し、ページは
 *   force-dynamic なので「次のリロードで毎回 Notion から最新取得」される。
 *   revalidatePath("/") を呼ぶと保存のたびにルートが再取得され、画面がちらつく
 *   （実質リロード）ため、意図的に行わない。
 * - 失敗時は例外がそのまま呼び出し側に伝播し、クライアントでロールバック＋トースト。
 */

export async function updateStageAction(
  pageId: string,
  stage: StageKey,
): Promise<void> {
  await updateCandidateStage(pageId, stage);}

export async function updateProfileAction(
  pageId: string,
  patch: Partial<Profile>,
): Promise<void> {
  await updateCandidateProfile(pageId, patch);}

export async function updateAxisScoresAction(
  pageId: string,
  axis: AxisScores,
): Promise<void> {
  await updateCandidateAxisScores(pageId, axis);}

export async function setArchivedAction(
  pageId: string,
  archived: boolean,
): Promise<void> {
  await setCandidateArchived(pageId, archived);}

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
  await addContactLog(params);}
