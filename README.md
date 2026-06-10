# 人脈営業ツール（personal-network-sales）— 設計・実装ドキュメント

AI-Driven School 月次課題（workspace-ui-kit を自分の業務向けに作り変える）の設計・実装記録です。
自分の人脈経由（既存知人・紹介・コミュニティ + これから交流会や仕事で出会う新規）の営業活動を支える、Next.js + Notion API 連携のツール。

## 🔗 公開URL（最新・第7回「画面に記憶を持たせる」提出物）

| 種別 | URL | 用途 |
|------|-----|------|
| **公開アプリ（提出物①）** | **https://personal-network-sales.vercel.app** | Vercel 公開。Notion(デモDB/ダミー)に永続化、実 AI 連絡文も動作（無認証＝公開はダミーデータのみ） |
| **課題図解（提出物②）** | **https://network-sales-memory.surge.sh** | 第7回図解。原本 [submission/07-memory-notion-deploy.html](submission/07-memory-notion-deploy.html) |
| GitHub リポジトリ | https://github.com/dan-yuta/personal-network-sales | 設計・実装の全履歴 |

> 第4回グループセッション用の発表資料（公開）: https://network-sales-savemap.surge.sh （原本 [submission/groupsession-savemap.html](submission/groupsession-savemap.html) + [トークメモ](submission/groupsession-talk.md)）。
> 前回（第5/6回）のツール全体像の図解は https://network-sales-overview.surge.sh/ （原本 [submission/tool-overview.html](submission/tool-overview.html)）。

```
┌─────────────────────────────────────────────────────────────┐
│   workspace-ui-kit  (Next.js 16 / 4ペイン UI)               │
│              │                                               │
│              │  Notion API  (営業候補リスト + 接触ログ)      │
│              ▼                                               │
│   自分の営業活動を時系列で追える状態に                       │
└─────────────────────────────────────────────────────────────┘
```

---

## ディレクトリ構造

```
personal-network-sales/          ← リポジトリルート
├── README.md                    ← このファイル (全体index)
├── docs/                        ← 設計ドキュメント (合意済みの設計)
│   ├── 00_ツール起動・確認方法.md
│   ├── 01_プロジェクト概要.md
│   ├── 02_UI設計書.md
│   ├── 03_データ設計書.md
│   ├── 04_技術仕様書.md
│   ├── 05_実装ロードマップ.md
│   ├── 06_やることリスト.md
│   └── 07_工夫したポイント.md
├── tool/                        ← 実装モジュール (workspace-ui-kit のコピー、編集対象)
├── assets/                      ← 画像・スクリーンショット・図表素材
├── notes/                       ← 実装中の雑記・議事録・KPT・振り返り
├── submission/                  ← 最終提出物 (tool-overview.html ほか)
├── references/                  ← 外部資料・参考リンク集
└── .gitignore                   ← Git管理除外設定
```

## ドキュメント一覧

| # | ファイル | 内容 |
|---|----------|------|
| **0** | **[docs/00_ツール起動・確認方法.md](docs/00_ツール起動・確認方法.md)** | **このファイルだけ読めば起動できる手順書（前提・インストール・起動・動作確認・トラブル対応）** |
| 1 | [docs/01_プロジェクト概要.md](docs/01_プロジェクト概要.md) | 背景・目的・スコープ・対象顧客像（人脈ベース）・営業フロー |
| 2 | [docs/02_UI設計書.md](docs/02_UI設計書.md) | 4ペイン責務・ステージタブ・画面構造のアスキーモック |
| 3 | [docs/03_データ設計書.md](docs/03_データ設計書.md) | 既存Notion DB分析・接触ログDB追加・ER図・同期規約 |
| 4 | [docs/04_技術仕様書.md](docs/04_技術仕様書.md) | 技術スタック・実行環境・認証・楽観的更新フロー |
| 5 | [docs/05_実装ロードマップ.md](docs/05_実装ロードマップ.md) | 着手順・未決事項・フェーズ計画 |
| 6 | [docs/06_やることリスト.md](docs/06_やることリスト.md) | 全タスクの進捗管理（Phase別表形式） |
| 7 | [docs/07_工夫したポイント.md](docs/07_工夫したポイント.md) | 設計・実装でこだわった16点（判断/データ/UI/AI/コード基盤/進め方/堅牢性/公開/状態復元。#16=公開AIのコストをどの層で守るか） |
| 8 | [docs/08_修正・トラブルシュート記録.md](docs/08_修正・トラブルシュート記録.md) | 第7回で遭遇した不具合の 症状→原因→対処→学び（Mermaid 図つき） |

### 提出物（グループセッション準備）

| 形式 | URL / ファイル | 内容 |
|------|---------------|------|
| **公開デプロイ** | **https://network-sales-overview.surge.sh/** | グループセッションで共有する公開 URL。Surge.sh、検索エンジン非インデックス |
| HTML 原本 | [submission/tool-overview.html](submission/tool-overview.html) | 必須「解決したい課題」+ 任意1「ペイン構成」+ 連絡文作成タブ（11シーン）+ **工夫したポイント** の図解 |

---

## 工夫したポイント

設計・実装の過程でこだわった16点は [docs/07_工夫したポイント.md](docs/07_工夫したポイント.md) （正本）と [notes/2026-05-12_craftsmanship.md](notes/2026-05-12_craftsmanship.md) （制作時の雑記）にまとめています。

ハイライト:
- **grill-me で1問ずつ詰めた** — 「なぜその判断にしたか」を docs に残せる
- **既存 Notion DB を尊重** — ゼロからスキーマを作らず、既存リストを流用
- **接触ログ DB だけ追加** — スキーマ拡張は最小限に
- **Pane4 をタブ化** — 「接触ログ」と「AI連絡文作成」を同居
- **連絡文に Vision 対応** — LINE スクリーンショットも AI に渡せる
- **テンプレート参照と実装の分離** — `100_tool/workspace-ui-kit/` は書き換え禁止、`tool/` を編集

---

## このドキュメント群の位置付け

`/grill-me` スキルを使い、計画段階で発生する全ての分岐を1問ずつ詰めて到達した「合意済みの設計」を、後から自分が読み返せる形で記録したものです。
実装着手後に判断方針を見失ったとき、このフォルダに戻ってきて方針を確認するために使います。

```
                ┌────────────────────────┐
   グリル開始 ─►│  設計ツリーを1問ずつ   │─► 合意 ─► このドキュメント群
                │  詰めて分岐を解決      │
                └────────────────────────┘
                        │
                        └─► 実装フェーズへ（次は docs/05_実装ロードマップ.md）
```

---

## 関連リソース

- **作業正本リポジトリ**: `C:\Users\dangi\src\personal-network-sales\` (2026-05-24 に OneDrive 外に移行)
- **GitHub**: https://github.com/dan-yuta/personal-network-sales (2台 PC 同期は git push/pull で)
- **テンプレート（参照のみ・絶対に書き換えない）**: OneDrive 配下の `100_tool/workspace-ui-kit/` (タッチしない)
- **既存Notion DB**: 営業候補リスト（自社の業務関連ページ配下に配置）
- **設計ベース**: workspace-ui-kit（4ペイン構造の踏襲ルート、`designing-workspace-ui` スキル）

---

## 現在地（2026-05-26 時点）

```
第7回ワーク発表 (5月末) — 提出完了 (2026-05-26)
├─ 第3回グループセッション準備 (5/13)              ✓ 完了
│   └─ 図解 + Surge.sh 公開: https://network-sales-overview.surge.sh/
├─ 第6回講義受講後の機能追加 (5/24)
│   ├─ schema 拡張: stageKey 4種類 → 6種類       ✓ (lost / held 追加)
│   ├─ Pane1 ステージタブ: アイコン + ステージ色   ✓
│   ├─ Pane2: スコアバッジ色分け + ソート機能     ✓
│   ├─ Pane2 ヘッダー: 「× 絞り込み解除」ボタン   ✓
│   ├─ Pane3 セクション見出し: アイコン付き       ✓
│   ├─ Pane4 タブ強化: アイコン + 手段別バッジ色  ✓
│   ├─ Pane1 件数バッジ: candidates から動的派生  ✓
│   ├─ Next.js dev indicator 非表示              ✓
│   └─ リポジトリを OneDrive 外に移行            ✓ src 配下
├─ 100 人運用想定の磨き込み (5/25)                ✓
│   ├─ フリガナ optional + 末尾グルーピング       ✓
│   ├─ 検索スコープ切替 + 黄色ハイライト          ✓
│   ├─ Toast Undo (アーカイブ / 移動 / 削除)      ✓
│   ├─ キーボードショートカット + ヘルプ          ✓
│   ├─ InlineTextField 未保存●+ 自動保存 800ms   ✓
│   ├─ 最終接触の相対表記 (12日前/3週間前/1ヶ月前) ✓
│   ├─ Pane3 評価 4 軸クイック編集 (星クリック)   ✓
│   ├─ Pane3 営業条件・候補者情報・評価カード折りたたみ ✓
│   ├─ Pane2 ステージグループ折りたたみ           ✓
│   ├─ 接触ログ追加クイック日付 (今日/昨日/一昨日) ✓
│   └─ Notion 連携準備 (priority / nextActionMemo / backNetwork) ✓
├─ サンプルデータ拡張 (5/25)                       ✓
│   └─ 候補者 14人 → 30人 (海外名・空欄・接触ログなし含む)
└─ 第7回提出 (2026-05-26 完了)                    ✓ 完了
    ├─ 画面スクリーンショット撮影 (01-overview.png) ✓
    ├─ 苦戦したポイントの整理 → Section H 追加 (3 点) ✓
    ├─ submission/tool-overview.html 仕上げ        ✓ slim 化 + 校正 + 用語修正
    └─ Surge.sh 再デプロイ + GitHub push           ✓ 091ad16 まで反映
```

| 起動環境 | URL | 状態 |
|----------|-----|------|
| **公開デプロイ（課題図解）** | **https://network-sales-overview.surge.sh/** | 2026-05-26 提出版で公開済み (slim 版 ~58KB / Section A〜H + まとめ + Glossary) |
| 実装モジュール `tool/` | http://localhost:3001 | 「人脈営業ワークスペース」+ 30人サンプル候補者 (6 ステージ分布) |

詳細は [docs/06_やることリスト.md](docs/06_やることリスト.md) と [notes/2026-05-24_session-record.md](notes/2026-05-24_session-record.md) を参照。

---

## 4ヶ月目（第7回宿題「画面に記憶を持たせる」）の進捗（2026-06-10 完了）

第7回講義のスコープ＝**Notion を保存先にした永続化 ＋ Vercel 公開**。さらに発展課題（AI連絡文）まで**完了・提出済み**。
保存先は grill-me で **Notion 確定**（推奨の Neon は不採用。理由は「既存業務が Notion 上にあり流用でき、人が直接 DB を見られる」一方、代償＝AIとの距離。だから定義・マスタはリポジトリに残すハイブリッド）。

| 提出物 | URL |
|------|-----|
| **公開アプリ（提出物①）** | **https://personal-network-sales.vercel.app** （NotionデモDBに永続化・実AIも動作） |
| **課題図解（提出物②）** | **https://network-sales-memory.surge.sh** （原本 [submission/07-memory-notion-deploy.html](submission/07-memory-notion-deploy.html)） |

```
必須課題＋発展課題まで完了（tsc + vitest 112 件 通過・next build OK・push 済）
├─ ステージ 6→7 段階化（紹介進行中 を追加、実 Notion DB と一致）      ✓
├─ Notion データ層（dataSources API v5・読み書き）                  ✓
│   └─ lib/notion/{schema,props,candidates,contact-logs}.ts
├─ Server Actions（app/actions.ts。revalidatePath は最終的に全廃＝楽観更新＋force-dynamic） ✓
├─ page.tsx を await listCandidates()＋force-dynamic に                ✓
├─ Phase C: ステージ書込の永続化 ＋ Vercel 公開（提出可能チェックポイント）  ✓
├─ Phase D: 編集サーフェス全面の永続化（プロフィール/評価4軸/アーカイブ/接触ログ/最終連絡日） ✓
├─ Phase E（発展課題）: AI連絡文（generateDraftMessage・vision・接触ログ保存）  ✓
│   └─ ローカル／公開 Vercel 両方で実AI（Sonnet）。コストは財布側上限で管理・Upstash不採用
└─ デモ Notion DB 構築（MCP）＋ seed-notion.mjs（冪等・ダミー投入）        ✓
```

- DB は 2 セット運用（公開=デモ/ダミー、ローカル=本番）。データソース ID は
  [docs/03_データ設計書.md](docs/03_データ設計書.md) と
  [notes/2026-06-08_session-record.md](notes/2026-06-08_session-record.md)（2026-06-09/10 追記含む）参照。
- トラブルシュート記録（不具合9件の症状→原因→対処→学び）: [docs/08_修正・トラブルシュート記録.md](docs/08_修正・トラブルシュート記録.md)
- 実装プラン全体: `~/.claude/plans/serialized-juggling-matsumoto.md`

---

## 作成情報

- 作成日: 2026-05-10
- 最終更新: 2026-06-10
- 作成者: 段木 裕太
- 設計手法: `grill-me` スキルによる対話的グリル
- 提出先: AI-Driven School 受講生ポータル
