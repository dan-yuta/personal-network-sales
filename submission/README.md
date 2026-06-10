# submission/ — 最終提出物

AI-Driven School の宿題提出物を置くフォルダです。回ごとに図解HTMLを追加しています。

---

## 第7回宿題（4ヶ月目「自分の画面に記憶を持たせる」/ 2026-06）

| 種別 | URL / ファイル | 備考 |
|------|----------------|------|
| **公開アプリ（提出物①）** | **https://personal-network-sales.vercel.app** | Vercel デプロイ。Notion(デモDB/ダミー)に永続化。無認証＝公開はダミーデータのみ |
| **課題図解（提出物②）** | **https://network-sales-memory.surge.sh** | Surge公開・検索エンジン非インデックス。原本は [07-memory-notion-deploy.html](07-memory-notion-deploy.html) |
| GitHub リポジトリ | https://github.com/dan-yuta/personal-network-sales | 設計・実装の全履歴 |

- テーマ: リロードで消えていた画面に **Notion を保存先**として記憶を持たせ、**Vercel** で公開。
- 保存先の線引き: 編集データ=Notion / 定義・マスタ=リポジトリ（ハイブリッド）。詳細は図解 B・C 章。
- **発展課題（任意）も達成**: AI 連絡文の下書き機能（Anthropic API・vision）を実装し、**公開URLでも動作**。公開での課金は「財布側の上限（前払い残高/月額上限・自動チャージOFF）」で守り、Upstash 等のアプリ側レート制限は不採用。詳細は図解「発展課題」節。
- スクショ: `assets/screenshots/07-overview.png`（公開画面のクリーン版）を **figure 内に base64 で埋め込み済み**（単一ファイルデプロイでも表示される）。AI タブのスクショを足すなら `07-ai-draft.png` 等で追加可（任意）。

### 第4回グループセッション用（発表・共有用。提出物②とは別）

「何を・どこに保存するか」を初対面の人にも伝える共有資料。提出物②（07図解）とは役割を分けて独立管理する。

| 種別 | ファイル | 備考 |
|------|----------|------|
| **発表用 図解（HTML）** | [groupsession-savemap.html](groupsession-savemap.html) | 画面共有用。§0 ツール紹介 → §1 何を残すか → §2 保存先マップ（主役）→ §3 なぜNotion → §4 決定/論点。デザインは他図解と統一・自己完結（CDN・画像不使用） |
| **トークメモ（台本）** | [groupsession-talk.md](groupsession-talk.md) | 5分の発表台本（時間配分・話す文例・想定質問つき） |

- 公開する場合の Surge 例: `surge <dir> network-sales-savemap.surge.sh`（手順は下記「デプロイ手順」に準ずる。ソースは `groupsession-savemap.html`）。
- この回は「grill-me で整理して話す」のが要件で清書資料は必須ではないが、初対面の人向けにツール紹介を含めた共有資料として用意。

---

## 第5回宿題 / 第3回グループセッション（2026-05）

以下は前回（人脈営業ツールの全体像）の提出物。

---

## 公開 URL（グループセッション共有用）

| 種別 | URL | 備考 |
|------|-----|------|
| **課題図解（公開）** | **https://network-sales-overview.surge.sh/** | Surge.sh デプロイ、検索エンジン非インデックス |
| GitHub リポジトリ | https://github.com/dan-yuta/personal-network-sales | 設計・実装の全履歴 |

---

## 現在のファイル

| ファイル | 内容 | 状態 |
|---------|------|------|
| [tool-overview.html](tool-overview.html) | 課題図解の原本 (Hero + Section A〜H + まとめ + 巻末 Glossary) | **2026-05-26 提出完了版** (slim 化 + スクショ埋め込み + Section H「苦戦したポイント」+ 校正 + 用語修正)。**Surge 公開済み** |
| README.md | このファイル | — |
| [assets/screenshots/](assets/screenshots/) | 画面キャプチャ | **01-overview.png** (4ペイン全景、鈴木太郎選択中) 撮影済 |

> `tool-overview.html` は単一ファイル（CDN ベース、ビルド不要）。ブラウザでローカル直接開いても、Surge にデプロイしても同じ見た目になる。
> 30人ぶんの架空候補者データを `tool/data/candidates.json` にシードしているが、本図解内は Pane モック内で代表 3 件を抜粋して図示。

---

## 図解の構成 (slim 版 ~58KB / Section A〜H + まとめ + 巻末 Glossary)

```
┌────────────────────────────────────────────────────────┐
│  Hero + ONE-PAGE SUMMARY (+ 目次 + 右下ジャンプボタン)  │
│   └─ Notion ← Tool → Anthropic の全体俯瞰              │
├────────────────────────────────────────────────────────┤
│  Section A. そもそも何を解決するツールか                │
│   └─ 現状の困りごと / ありたい姿 (Before / After)       │
├────────────────────────────────────────────────────────┤
│  Section B. 営業フローとカバーする相手                  │
│   └─ 6 段階 + 派生紹介の循環 + 対象 (既知/紹介/         │
│      コミュニティ・同期会/交流会・新規)                  │
├────────────────────────────────────────────────────────┤
│  Section C. 画面構成 — 4ペインのワークスペース          │
│   └─ ブラウザモック + 実画面スクリーンショット          │
│      (01-overview.png、クリックで拡大) + 責務サマリ     │
├────────────────────────────────────────────────────────┤
│  Section D. Pane4 タブA — 接触ログを時系列で積む       │
│   └─ 入力フォーム + 履歴UIモック + 楽観的更新フロー    │
├────────────────────────────────────────────────────────┤
│  Section E. Pane4 タブB — AI に連絡文を下書きさせる    │
│   └─ 11 シーン + 媒体 3 種 + Vision (画像渡し) +        │
│      生成フロー + 「送信はしない」設計                  │
├────────────────────────────────────────────────────────┤
│  Section F. 裏側のデータの流れ (予定/未確定含む)        │
│   └─ アーキ図 (PC/ブラウザ/Next.js + Vercel + Notion + │
│      Anthropic / Claude Sonnet 4.6)                      │
├────────────────────────────────────────────────────────┤
│  Section G. 設計・実装で工夫したポイント (6 点)         │
│   └─ ① AI に 1 問ずつ質問してもらってから作った        │
│      ② 今使っている Notion をそのまま尊重              │
│      ③ 「接触ログ」だけ新規に追加                       │
│      ④ 右端の Pane4 をタブ切替に                        │
│      ⑤ 過去のやり取りを画像でも AI に渡せる            │
│      ⑥ サンプルデータで先に動かした                     │
├────────────────────────────────────────────────────────┤
│  Section H. 苦戦したポイント (3 点)                     │
│   └─ ① 配布されたひな形が「採用」用だったこと          │
│      ② 連絡文の「場面の数」が決まらなかった (3→11)      │
│      ③ どの機能を入れるかの取捨選択                     │
├────────────────────────────────────────────────────────┤
│  まとめ — 覚えて帰ってほしい 3 つのこと                 │
│   └─ ① Notion はそのまま、不足分だけツールで補う        │
│      ② 4ペインで「絞り込み→選択→詳細→次の一手」を1画面 │
│      ③ AI は「最終決定」ではなく「最速の下書き」担当    │
├────────────────────────────────────────────────────────┤
│  巻末: Glossary (Pane / API / 楽観的更新 などの参照用)  │
└────────────────────────────────────────────────────────┘
```

> 提出要件4点すべて充足: ✅ 画面キャプチャ (Section C 末尾の 01-overview.png) /
> ✅ 解決課題 (Section A) / ✅ 工夫 (Section G) / ✅ 苦戦 (Section H)。
> 2026-05-26 に slim 化 + Section H 追加 + 校正 + 用語修正で提出版完成、Surge 公開済み。

---

## デプロイ手順

詳細は [docs/00_ツール起動・確認方法.md](../docs/00_ツール起動・確認方法.md) も参照。

### 第7回図解（07-memory-notion-deploy.html → network-sales-memory.surge.sh）

現行の提出物②。図解を更新したら、この手順で再デプロイする。

```powershell
# 1. Surge アカウント確認 (必ず先に確認)
surge whoami   # 期待値: dangi.yuta.business@gmail.com

# 2. デプロイ用フォルダに index.html としてコピー
$src  = "C:\Users\dangi\src\personal-network-sales\submission\07-memory-notion-deploy.html"
$dest = "C:\Users\dangi\deploy\personal-network-sales-memory"
New-Item -ItemType Directory -Force -Path $dest | Out-Null
Copy-Item -Force $src -Destination "$dest\index.html"

# 3. デプロイ（更新も同じコマンド）
surge $dest network-sales-memory.surge.sh
```

### 第6回図解（初回デプロイ）

```powershell
# 1. Surge アカウント確認 (必ず先に確認)
surge whoami
# 期待値: dangi.yuta.business@gmail.com

# 2. デプロイ用フォルダ準備
$src  = "C:\Users\dangi\src\personal-network-sales\submission\tool-overview.html"
$dest = "C:\Users\dangi\deploy\personal-network-sales-overview"
New-Item -ItemType Directory -Force -Path $dest | Out-Null
Copy-Item -Force $src -Destination "$dest\index.html"

# 3. デプロイ
surge $dest network-sales-overview.surge.sh
```

### 更新時の再デプロイ

```powershell
Copy-Item -Force "C:\Users\dangi\src\personal-network-sales\submission\tool-overview.html" -Destination "C:\Users\dangi\deploy\personal-network-sales-overview\index.html"
cd "C:\Users\dangi\deploy\personal-network-sales-overview"
surge . network-sales-overview.surge.sh
```

### 取り下げ

```powershell
surge teardown network-sales-overview.surge.sh
```

---

## 注意

- **個人情報・本物の営業データは含めない**: tool-overview.html は架空候補者データを使用 (`tool/data/candidates.json` シードは 30 人、本図解内の Pane モックは代表 3 件を抜粋)
- **検索エンジン非インデックス**: `<meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex">` 設定済み、外部にリンクが漏れても拡散しない
- **Surge アカウント**: 公開資料は `dangi.yuta.business@gmail.com` で運用（複数アカウントあるため `surge whoami` で必ず確認）

---

## 関連ドキュメント

- [../README.md](../README.md) — リポジトリ全体の index
- [../docs/00_ツール起動・確認方法.md](../docs/00_ツール起動・確認方法.md) — `tool/` のローカル起動手順
- [../docs/02_UI設計書.md](../docs/02_UI設計書.md) — 4ペイン + 連絡文 11 シーンの設計
- [../docs/07_工夫したポイント.md](../docs/07_工夫したポイント.md) — 16 点の craftsmanship 整理（#16 = 公開 AI のコストをどの層で守るか）
