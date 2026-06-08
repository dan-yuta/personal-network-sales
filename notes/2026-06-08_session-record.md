# 2026-06-08 セッション記録 — 7回目宿題（Notion永続化＋Vercel公開）着手

第7回講義（4ヶ月目「自分の画面に記憶を持たせる」）の課題に着手。
保存先は **Notion** で確定。本セッションは grill-me で設計を詰め、読み取りパスまで実装した。

## 確定した設計（grill-me 結果）

- **スコープ**: フル配線＋AI連絡文（発展課題）まで。ビルドは縦串early-deploy順。
- **保存先**: Notion。DB を 2 セット運用（公開=デモ/ダミー、ローカル=本番/実データ）、
  環境変数のデータソースIDで切替。`candidates.json` はデモDBへのシードに降格。
- **保存先マップ（採点の核）**: 編集データ=Notion、定義・マスタ=リポジトリ。
  | データ | 保存先 | 理由 |
  |---|---|---|
  | 候補者プロフィール／評価4軸(現在値)／ステージ／優先度／アーカイブ | Notion(候補者DB) | ユーザーが編集する実データ |
  | 接触ログ(1:N) | Notion(接触ログDB) | 時系列で増える編集データ。最後の1件しか持てない自由メモでは不足 |
  | 最終連絡日 | Notion | 接触ログから派生して保存(denormalized) |
  | ステージ定義/色/ラベル・連絡文シーン・アプリ設定 | リポジトリ | マスタ定義。AIの手元に置く |
- **Notion採用理由（vs 推奨Neon）**: 既存業務がNotion上にあり流用可・人が直接DBを見れる。
  代償＝「AIとの距離が遠くなる」（講義の論点）→ だから定義はリポジトリに残すハイブリッド。
- **公開の個人情報対策**: 実データを公開URLに晒さないため、デモDB（ダミー）に向ける。

## 実装（コミット済み・全て tsc + vitest 通過）

1. **7段階移行**: ステージを6→7に（`紹介進行中`/referral 追加）。実Notion DBの
   進捗状況select(7択)と一致させた。schema/labels/positions/PositionPane/Workspace。
2. **Notion データ層**（dataSources API v5）:
   - `lib/notion/schema.ts` 正規化スキーマ（7段階＋デモ列、欠損許容）
   - `lib/notion/props.ts` プロパティ抽出ヘルパー共通化
   - `lib/notion/candidates.ts` listCandidates / toCandidate / 各種 update
   - `lib/notion/contact-logs.ts` 一覧取得 / 追加（最終連絡日 自動同期）
3. **Server Actions**: `app/actions.ts`（"use server"・revalidatePath）。
4. **page.tsx**: `await listCandidates()` に差し替え（NOTION_TOKEN 未設定時は
   candidates.json フォールバック）。
5. **seed-notion.mjs**: 冪等シード（実クリア→30人ダミー）。本番DB誤爆ガード付き。
6. **テスト**: server-only を jsdom 用スタブ化、toCandidate マッピング単体テスト追加（108件）。

## Notion DB（データソースID）

| 用途 | 名称 | データソースID | 備考 |
|---|---|---|---|
| 公開デモ・候補者 | 営業候補リスト_AI school用 | `3764fafd-6673-811c-99a8-000b758acad2` | 実データ入り→公開前に seed でクリア＋ダミー化が必要 |
| 公開デモ・接触ログ | 接触ログ_AI school用 | `07c04273-d0c0-4bad-a567-7302a3d11654` | 新規作成・空 |
| ローカル本番・候補者 | 営業候補リスト | `b36fdbb0-2266-4ce0-8327-00c10468bbb4` | 後日 .env.local 差し替えで使用 |

デモ候補者DBには MCP で列を追加済み（紹介進行中／フリガナ／生年月日／接触経路／
想定取引規模Min・Max／評価4軸×4／アーカイブ）。

## 工夫したポイント（図解 item4 素材）

- 実装前に **実Notionスキーマを fetch して検証**（Step 0）。docs の想定とのズレを発見:
  - 進捗状況が実は7段階（紹介進行中）だった → ローカル6段階を7段階に修正。
  - フリガナ/生年月日/想定取引規模の列は実在しなかった → デモDBに追加で対応。
- サブエージェント3体でプランを敵対的レビュー。@notionhq/client v5 で旧 `databases.query`
  が廃止され `dataSources.query` が正しいこと等をコードで実証してから着手。
- 保存先を「編集データ=Notion / 定義=リポジトリ」で線引きし、AIとの距離を意識した。

## 苦戦したポイント（図解 item4 素材）

- **Claude Code の Max プランと Anthropic API は別課金**。公開アプリのAI呼び出しは
  API従量課金になるため、公開では Haiku＋Upstash レート制限で防御する設計に。
- Server Action のレート制限は **middleware では効かない** → action 冒頭に置く必要がある。
- 公開DBに実データがあると個人情報漏洩 → デモDBをクリアしてダミー化する判断（破壊的）。
- vitest(jsdom) は `server-only` を import すると throw → テスト用 alias スタブで回避。

## 次の一歩 / ブロッカー

- **要・ユーザー**: Notion Internal Integration 作成 → トークン(ntn_) →
  デモ2DBに「コネクト」追加 → `.env.local` 設定。これが揃うと:
  seed 実行 → 表示検証 → 縦串(stage書込) → **Vercel公開（提出可能チェックポイント）**。
- その後: 書込全面(D) → AI連絡文+Upstash(E) → 図解統合・提出(F)。

詳細プラン: `~/.claude/plans/serialized-juggling-matsumoto.md`
