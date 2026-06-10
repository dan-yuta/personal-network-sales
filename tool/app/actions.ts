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
import {
  generateDraftMessage,
  type DraftCandidateSummary,
  type DraftImage,
  type DraftMedium,
  type DraftScene,
} from "@/lib/anthropic/draft-message";
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

/**
 * 連絡文生成の結果。
 *   - { ok: true }  : AI 生成成功（本物の連絡文）。
 *   - { ok: false } : ANTHROPIC_API_KEY 未設定（公開デモ等）。クライアントは
 *                     サンプル文（getMockDraft）にフォールバックして案内表示する。
 * ※ 生成の実エラー（API 失敗等）は例外として throw され、クライアントで catch する。
 */
export type DraftMessageResult =
  | { ok: true; text: string }
  | { ok: false; reason: "no-key" };

/**
 * AI 連絡文ドラフトを生成する（発展課題 Phase E）。
 *
 * 課金・公開ポリシー（grill 後の確定方針）:
 *   - AI 生成は **ANTHROPIC_API_KEY が設定された環境でのみ**動作する。
 *   - 公開 Vercel ではキーを設定しない運用にすることで、無認証の公開URLに
 *     「誰でも叩けて課金が乗る入口」を作らない。よって Upstash 等のレート制限は
 *     不要（このツールは現状ひとり運用で、AI はローカル実データ環境で使う）。
 *   - キー未設定時は { ok:false, reason:"no-key" } を返し、画面はサンプル文を出す。
 *   - 将来チーム公開で AI を公開したくなったら、ここにレート制限を足せる。
 *
 * 候補者基本情報（DraftCandidateSummary）はクライアントの取得済み Candidate から
 * 組み立てて渡す。接触ログ直近3件はここで Notion から取得する。
 */
export async function draftMessageAction(params: {
  candidateId: string;
  candidate: DraftCandidateSummary;
  scene: DraftScene;
  medium: DraftMedium;
  note?: string;
  pastInteractionText?: string;
  pastImages?: DraftImage[];
}): Promise<DraftMessageResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, reason: "no-key" };
  }
  const logs = await listContactLogsForCandidate(params.candidateId);
  const text = await generateDraftMessage({
    candidate: params.candidate,
    recentLogs: logs.slice(0, 3),
    scene: params.scene,
    medium: params.medium,
    note: params.note,
    pastInteractionText: params.pastInteractionText,
    pastImages: params.pastImages,
  });
  return { ok: true, text };
}
