import "server-only";
import { getAnthropicClient, ANTHROPIC_MODEL } from "./client";
import type { NotionCandidate, NotionContactLog } from "@/lib/notion/schema";

/**
 * 連絡文ドラフト生成 (server-only)。
 *
 * 設計の出典:
 *   - docs/02_UI設計書.md の「タブB: 連絡文作成」
 *   - docs/04_技術仕様書.md の「連絡文作成機能の技術構成」
 *
 * 入力:
 *   - 候補者基本情報 (NotionCandidate)
 *   - 接触ログ直近3件 (NotionContactLog[])
 *   - シーン (5種)
 *   - 媒体 (3種)
 *   - 補足フリーテキスト (任意)
 *   - 過去のやり取り画像 (任意・base64、最大3枚)
 *
 * 出力:
 *   - 生成された連絡文 (string)
 *
 * Prompt Caching:
 *   - system プロンプトに `cache_control: { type: "ephemeral" }` を付ける
 *   - 同じ候補者で複数回生成・再生成するときも、system はキャッシュ命中
 */

export type DraftScene =
  | "初回声かけ（既存知人）"
  | "初回声かけ（新規の人）"
  | "フォローアップ"
  | "紹介依頼"
  | "お礼"
  | "再アプローチ";

export type DraftMedium = "メール" | "LINE" | "電話用トーク台本";

export type DraftMessageInput = {
  candidate: NotionCandidate;
  recentLogs: NotionContactLog[]; // 直近3件想定
  scene: DraftScene;
  medium: DraftMedium;
  note?: string; // 補足フリーテキスト
  pastInteractionText?: string; // 文面コピー
  pastImagesBase64?: string[]; // 画像 (最大3枚)
};

const SYSTEM_PROMPT = `あなたは段木さんの営業文ドラフト作成アシスタントです。

人脈ベース営業の文体で書いてください:
- 紹介経路を明示し、関係性を尊重する
- 押し売りトーンを避け、自然な近況伺いから入る
- 候補者情報・接触ログ直近・紹介ネットワークを文脈に反映
- 過去のやり取り（文面 or 画像）が提供された場合は、そこから先方の温度感・話題・口調を読み取って反映
- 補足フリーテキストの「用件」を必ず反映

選択された媒体に応じて文体・長さを調整:
- メール: 件名 + 敬語の本文
- LINE: 短文・絵文字最小限・親密トーン
- 電話用トーク台本: 話し言葉・要点リスト
`;

/**
 * 連絡文ドラフトを Anthropic API で生成する。
 *
 * TODO: 実装
 *   const anthropic = getAnthropicClient();
 *   const messages = buildMessages(input);
 *   const response = await anthropic.messages.create({
 *     model: ANTHROPIC_MODEL,
 *     max_tokens: 1024,
 *     system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
 *     messages,
 *   });
 *   return extractText(response);
 */
export async function generateDraftMessage(
  input: DraftMessageInput,
): Promise<string> {
  void input;
  void getAnthropicClient;
  void ANTHROPIC_MODEL;
  void SYSTEM_PROMPT;
  throw new Error(
    "generateDraftMessage is not implemented yet. Phase 3 で Anthropic API 接続後に実装してください。",
  );
}
