import "server-only";
import { getAnthropicClient, ANTHROPIC_MODEL } from "./client";
import type { NotionContactLog } from "@/lib/notion/schema";

/**
 * 連絡文ドラフト生成 (server-only)。
 *
 * 設計の出典:
 *   - docs/02_UI設計書.md の「タブB: 連絡文作成」
 *   - docs/04_技術仕様書.md の「連絡文作成機能の技術構成」
 *
 * 入力:
 *   - 候補者基本情報 (DraftCandidateSummary。UI の Candidate から組み立てて渡す)
 *   - 接触ログ直近3件 (NotionContactLog[])
 *   - シーン (11種・営業フェーズ全体 + 派生紹介の連鎖)
 *   - 媒体 (3種)
 *   - 補足フリーテキスト (任意)
 *   - 過去のやり取り画像 (任意・base64、最大3枚)
 *
 * 出力:
 *   - 生成された連絡文 (string)
 *
 * Prompt Caching:
 *   - system プロンプトに `cache_control: { type: "ephemeral" }` を付ける。
 *   - 同じ system で複数回生成・再生成しても、system はキャッシュ命中（命中時は
 *     usage.cache_read_input_tokens に現れる）。
 *   - 注意: Haiku 4.5 の最小キャッシュ長は 4096 トークン。本 SYSTEM_PROMPT は
 *     それより短いので公開(Haiku)では実質キャッシュされない可能性があるが、
 *     付けても無害（エラーにはならない）。ローカル(Sonnet)では 1024〜のため命中する。
 *
 * モデル出し分け:
 *   - `ANTHROPIC_MODEL`（client.ts）で公開=Haiku / ローカル=Sonnet を切替。
 *
 * 画像 (vision):
 *   - base64 の ImageBlock として user メッセージに添付（最大3枚はクライアント検証）。
 */

/**
 * 連絡文生成に渡す候補者の基本情報。UI の `Candidate`（lib/schema）から
 * 必要な項目だけ抜き出して組み立てる軽量サマリ。Notion へ追加で往復しないため、
 * 候補者の取得済みデータ（page.tsx の listCandidates 由来）をそのまま使える。
 */
export type DraftCandidateSummary = {
  name: string;
  source?: string | null; // 接触経路（例: △△交流会で名刺交換）
  backNetwork?: string | null; // バック人脈（紹介の後ろ盾）
  stageLabel?: string | null; // ステージ日本語ラベル（例: 商談中）
  priorityLabel?: string | null; // 優先度日本語ラベル（高/中/低）
  lastContactDate?: string | null; // 最終連絡日 (ISO date)
};

/** base64 画像（data URL のプレフィックスを除いた本体 + メディアタイプ）。 */
export type DraftImage = {
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  data: string; // base64（"data:image/png;base64," は含まない）
};

export type DraftScene =
  // アプローチ前
  | "初回声かけ（既存知人）"
  | "初回声かけ（新規の人）"
  | "紹介依頼"
  // アプローチ中
  | "フォローアップ"
  // 商談中（営業/商談/クロージング観点）
  | "提案・サービス紹介"
  | "商談・条件すり合わせ"
  | "クロージング・意思確認"
  // 契約（契約観点）
  | "契約締結・条件確定"
  // 共通
  | "お礼"
  // 契約後・派生（既存知人を起点にさらに紹介を広げる）
  | "派生紹介の依頼"
  | "再アプローチ";

export type DraftMedium = "メール" | "LINE" | "電話用トーク台本";

export type DraftMessageInput = {
  candidate: DraftCandidateSummary;
  recentLogs: NotionContactLog[]; // 直近3件想定
  scene: DraftScene;
  medium: DraftMedium;
  note?: string; // 補足フリーテキスト
  pastInteractionText?: string; // 文面コピー
  pastImages?: DraftImage[]; // 過去のやり取り画像 (最大3枚・クライアント検証済み)
};

const SYSTEM_PROMPT = `あなたは段木さんの営業文ドラフト作成アシスタントです。

人脈ベース営業の文体で書いてください:
- 紹介経路を明示し、関係性を尊重する
- 押し売りトーンを避け、自然な近況伺いから入る
- 候補者情報・接触ログ直近・紹介ネットワークを文脈に反映
- 過去のやり取り（文面 or 画像）が提供された場合は、そこから先方の温度感・話題・口調を読み取って反映
- 補足フリーテキストの「用件」を必ず反映

選択されたシーンに応じて営業フェーズを意識:
- 初回声かけ（既存知人/新規の人）: 関係性の再確認・自己紹介から入り、押しは弱め
- 紹介依頼: 共通知人への敬意・先方への負担配慮を明示
- フォローアップ: 直近の接触内容（接触ログ）に必ず触れ、流れの自然な続きとして書く
- 提案・サービス紹介（営業観点）: 先方の課題仮説を起点に、サービスがどう貢献するかを簡潔に示す。価値→根拠→次のステップの順
- 商談・条件すり合わせ（商談観点）: 確認したい論点を3点以内に絞り、決裁構造・スケジュールに触れる
- クロージング・意思確認（クロージング観点）: 押し付けず、判断材料の不足がないか確認し、次のアクションと期限を明示
- 契約締結・条件確定（契約観点）: 契約条件の最終確認、書類の流れ、開始日や担当窓口を整理。事務的になりすぎず関係性に触れる
- お礼: 具体的なエピソードを1つ入れて温度感を出す
- 派生紹介の依頼: 既存知人との関係性をベースに、別の方をご紹介いただく依頼。直前のやり取り（契約・面会・お礼など）への感謝を起点にし、相手の負担に配慮しつつ「課題仮説」を具体的に提示する。紹介者へ感謝が伝わる文体を維持
- 再アプローチ: 過去の経緯への配慮を見せ、状況変化の有無を軽く尋ねる

選択された媒体に応じて文体・長さを調整:
- メール: 件名 + 敬語の本文
- LINE: 短文・絵文字最小限・親密トーン
- 電話用トーク台本: 話し言葉・要点リスト
`;

/** 候補者基本情報を AI 用の箇条書きテキストに整形する。 */
function formatCandidate(c: DraftCandidateSummary): string {
  const lines = [`氏名: ${c.name || "（不明）"}`];
  if (c.stageLabel) lines.push(`現在のステージ: ${c.stageLabel}`);
  if (c.priorityLabel) lines.push(`優先度: ${c.priorityLabel}`);
  if (c.source) lines.push(`接触経路: ${c.source}`);
  if (c.backNetwork) lines.push(`バック人脈（紹介の後ろ盾）: ${c.backNetwork}`);
  if (c.lastContactDate) lines.push(`最終連絡日: ${c.lastContactDate}`);
  return lines.join("\n");
}

/** 接触ログ直近 N 件を新しい順のテキストに整形する。 */
function formatLogs(logs: NotionContactLog[]): string {
  if (logs.length === 0) return "（記録なし）";
  return logs
    .map((l) => `- ${l.date}・${l.method}: ${l.content || "（内容メモなし）"}`)
    .join("\n");
}

/**
 * 入力から Anthropic Messages API の user メッセージ content ブロックを組み立てる。
 * 画像があれば base64 ImageBlock を先頭に置き（先方の温度感の読み取り用）、
 * その後に候補者情報・接触ログ・シーン・媒体・補足を1つの text ブロックに集約する。
 */
function buildUserContent(input: DraftMessageInput) {
  const {
    candidate,
    recentLogs,
    scene,
    medium,
    note,
    pastInteractionText,
    pastImages,
  } = input;

  const content: Array<
    | {
        type: "image";
        source: { type: "base64"; media_type: DraftImage["mediaType"]; data: string };
      }
    | { type: "text"; text: string }
  > = [];

  for (const img of pastImages ?? []) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: img.mediaType, data: img.data },
    });
  }

  const parts = [
    `# シーン\n${scene}`,
    `# 媒体\n${medium}`,
    `# 候補者の基本情報\n${formatCandidate(candidate)}`,
    `# 接触ログ（直近・新しい順）\n${formatLogs(recentLogs)}`,
  ];
  if (note?.trim()) parts.push(`# 補足（必ず反映する用件）\n${note.trim()}`);
  if (pastInteractionText?.trim())
    parts.push(`# 過去のやり取り（文面コピー）\n${pastInteractionText.trim()}`);
  if ((pastImages?.length ?? 0) > 0)
    parts.push(
      `# 過去のやり取り（添付画像）\n添付のスクリーンショットから先方の温度感・話題・口調を読み取って反映してください。`,
    );
  parts.push(
    `上記を踏まえ、${medium}向けの連絡文を1案、日本語で作成してください。前置きの説明は不要で、連絡文本文だけを返してください。`,
  );

  content.push({ type: "text", text: parts.join("\n\n") });
  return content;
}

/**
 * 連絡文ドラフトを Anthropic API で生成する。
 *
 * - system は frozen（候補者ごとに変えない）→ prompt caching が効く。
 * - 候補者情報・接触ログ・画像などの可変部は user メッセージ側に置く。
 * - max_tokens は連絡文1通に十分かつ小さめ（1024）。
 */
export async function generateDraftMessage(
  input: DraftMessageInput,
): Promise<string> {
  const anthropic = getAnthropicClient();

  const response = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: buildUserContent(input) }],
  });

  const text = response.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("")
    .trim();

  if (!text) {
    throw new Error(
      "AI から連絡文を取得できませんでした。もう一度お試しください。",
    );
  }
  return text;
}
