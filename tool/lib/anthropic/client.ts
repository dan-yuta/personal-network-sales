import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Anthropic クライアント生成 (server-only)。
 *
 * - 環境変数 `ANTHROPIC_API_KEY` を Server Action からのみ読む。
 * - クライアントコンポーネントから直接呼ぶと build 時に server-only がエラーを出す。
 */
export function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY が未設定です。.env.local を確認してください。",
    );
  }
  return new Anthropic({ apiKey });
}

export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
