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
 *   - シーン (11種・営業フェーズ全体 + 派生紹介の連鎖)
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
    "generateDraftMessage is not implemented yet. Phase E（発展課題）で Anthropic API 接続後に実装してください。",
  );
}
