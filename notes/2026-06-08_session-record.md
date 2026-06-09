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

---

## 2026-06-09 追記: Phase C 完了 → Vercel 公開達成（提出物①完成）

### やったこと
- ユーザーが Notion Internal Integration（アクセストークン方式）作成 → トークンを
  `.env.local` に設定 → デモ2DBに「コネクト」接続。スモークテストで `dataSources.query`
  200 を確認。
- `node scripts/seed-notion.mjs` 実行（既存90行クリア→30人ダミー投入）。
- `npm run dev` で30人がNotion経由表示を確認（読み取りパス end-to-end）。
- **Phase C 配線**: `Workspace.moveCandidate` のステージ跨ぎ時に `updateStageAction`
  を呼び Notion へ永続化。楽観更新維持、失敗時ロールバック＋Toast、**Undoも
  Notionへ反映**（UIだけ戻すとリロードで復活するため）。同ステージ内並び替えは
  非永続（Notionに順序列なし）。tsc/108テスト/書込ラウンドトリップ検証OK。
- `app/page.tsx` を `export const dynamic = "force-dynamic"` に（別端末リロードで
  確実に最新Notionデータを返すため）。
- **Vercel 公開**（71kaiji個人GitHub連携・Hobby・Root Directory=`tool`・デモenv3つ）。
  → **https://personal-network-sales.vercel.app**（HTTP200・候補者描画・force-dynamic確認）。

### 苦戦＝Vercelデプロイが連続失敗。真因特定までの記録（図解item4の主素材）
エラー: `ENOENT ... /.next/routes-manifest-deterministic.json`（`onBuildComplete from
Vercel` 段階で失敗。ビルド自体は毎回成功）。切り分けの順序と結論:
1. bundler? → `next build --webpack` に変更 → **変化なし**（red herring）。
2. env / Root Directory / 「Include files outside root」OFF → **変化なし**。
3. 文字列 `routes-manifest-deterministic` を **Next 16.2.6 / 16.2.7 / 16.3canary の
   tarball を展開して grep → どれにも存在しない**ことを実証。
   ＝このファイルは Next 由来でなく **Vercel のデプロイアダプタ（Next 16.2 で安定化
   した Adapters API: modifyConfig/onBuildComplete）が扱う成果物**と判明。
4. 公式情報 + 報告事例「Vercelの routes-manifest ENOENT は next.config の
   **`outputFileTracingRoot` を削除したら直る**」に合致。
5. **真因 = `next.config.ts` の `outputFileTracingRoot: projectRoot`**。サブディレクトリ
   (`tool`)に固定していたためアダプタのマニフェスト探索パスがずれていた。削除して解決
   （親階層に lockfile が無く、元の設定理由は現状不要）。**ローカルでアダプタは走らない
   ため再現しなかった**＝ローカル成功・Vercelのみ失敗の症状と一致。
   修正コミット: `2950b8b`。

### C5/C6/F 完了 — 提出物①②そろった
- C5: PCでドラッグ→F5で保持＋Notion直接確認の2点で永続化を実証（スマホは「PC前提ツール」
  のため不要と判断し省略）。
- C6/F2: 図解を新規作成 `submission/07-memory-notion-deploy.html`（前回 tool-overview.html
  のデザイン踏襲）。4必須項目網羅。スクショ `assets/screenshots/07-overview.png` 配置。
- 図解を Surge 公開 → **https://network-sales-memory.surge.sh**（アカウント
  dangi.yuta.business@gmail.com）。
- **提出物①: https://personal-network-sales.vercel.app / ②: https://network-sales-memory.surge.sh**

### Phase D 完了（2026-06-09）— 編集サーフェス全面を Notion 永続化
コミット `9074939`。これまで永続化はステージ移動のみだったのを、残る編集も全て Notion へ:
- D1 プロフィール: `setProfile` に diff 永続化（`updateProfileAction`）。テキスト欄は
  uncontrolled のため失敗時は画面巻き戻し不可→通知のみ（リロードで最新に揃う）。
- D2 評価4軸: `setAxisScore` で現在スナップショットを `updateAxisScoresAction`。
  楽観更新＋失敗時 scorecards ロールバック。
- D3 アーカイブ/復元: `setArchivedAction`。Undo も Notion 反映、失敗で巻き戻し。
- D4 接触ログ: `getMockLogs` 廃止。`listContactLogsAction` で表示、`addContactLogAction`
  ＋`useOptimistic` で追加（実ID付き一覧で確定、失敗は楽観追加を自動取消）。
- D5 最終連絡日: `Candidate.lastContactDate` 新設＋`toCandidate` マッピング。Pane2/Pane3
  バッジを Notion 由来に。ログ追加で `onContactLogAdded` 経由で即時更新。
- D6 直列化: 全書込を `writeChainRef` のキューに通し、連打・順序逆転・レート制限を回避。

検証: tsc / vitest 109 / next build（server-only 境界OK）/ 実デモDBで全操作の往復＋
最終連絡日同期を確認（一時 verify スクリプトで実証後に削除）。
補足: `lib/data/mockLogs.ts` は app から未使用化（テストは残置）。

### 残（任意の上積み）
- Phase E（AI連絡文 draft-message.ts 実装 + Upstash レート制限・発展課題）。
- Phase F 仕上げ（任意）。
