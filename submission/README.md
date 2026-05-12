# submission/ — 最終提出物

AI-Driven School 5回目宿題 / 第3回 グループセッションで共有する提出物を置くフォルダです。

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
| [tool-overview.html](tool-overview.html) | 課題図解の原本 (Section A 課題 + Section B ペイン構成 + Section C 連絡文作成タブ 11 シーン + Section D 工夫したポイント) | 2026-05-13 時点で最新 |
| README.md | このファイル | — |

> `tool-overview.html` は単一ファイル（CDN ベース、ビルド不要）。ブラウザでローカル直接開いても、Surge にデプロイしても同じ見た目になる。

---

## 図解の構成

```
┌─────────────────────────────────────────────────────┐
│  Section A. 解決したい課題 (必須)                    │
│   └─ 営業活動の困りごと / 解決アプローチ              │
├─────────────────────────────────────────────────────┤
│  Section B. ペイン構成 (任意1)                      │
│   └─ 4ペイン UI / 各ペインの責務 / データの流れ       │
├─────────────────────────────────────────────────────┤
│  Section C. 連絡文作成タブの詳細                     │
│   └─ 11 シーン (営業フェーズ全体 + 派生紹介の連鎖)   │
│      ・前: 初回声かけ × 2、紹介依頼                  │
│      ・中: フォローアップ                            │
│      ・商談: 提案 / 商談 / クロージング              │
│      ・契約: 契約締結・条件確定                      │
│      ・派生: 派生紹介の依頼                          │
│      ・共通: お礼 / 再アプローチ                     │
├─────────────────────────────────────────────────────┤
│  Section D. 工夫したポイント (代表 6 点)             │
│   └─ ① grill-me で1問ずつ詰めた                      │
│      ② 既存 Notion DB を尊重                         │
│      ③ Pane4 をタブ化                                │
│      ④ 連絡文に Vision 対応                          │
│      ⑤ 接触ログ DB だけ追加                          │
│      ⑥ モック先行（API 接続前から動く）              │
└─────────────────────────────────────────────────────┘
```

---

## デプロイ手順

詳細は [docs/00_ツール起動・確認方法.md](../docs/00_ツール起動・確認方法.md) も参照。

### 初回デプロイ

```powershell
# 1. Surge アカウント確認 (必ず先に確認)
surge whoami
# 期待値: dangi.yuta.business@gmail.com

# 2. デプロイ用フォルダ準備
$src  = "C:\Users\dangi\OneDrive\18_AI-Driven School用フォルダ\004_5回目宿題\personal-network-sales\submission\tool-overview.html"
$dest = "C:\Users\dangi\deploy\personal-network-sales-overview"
New-Item -ItemType Directory -Force -Path $dest | Out-Null
Copy-Item -Force $src -Destination "$dest\index.html"

# 3. デプロイ
surge $dest network-sales-overview.surge.sh
```

### 更新時の再デプロイ

```powershell
Copy-Item -Force "C:\Users\dangi\OneDrive\18_AI-Driven School用フォルダ\004_5回目宿題\personal-network-sales\submission\tool-overview.html" -Destination "C:\Users\dangi\deploy\personal-network-sales-overview\index.html"
cd "C:\Users\dangi\deploy\personal-network-sales-overview"
surge . network-sales-overview.surge.sh
```

### 取り下げ

```powershell
surge teardown network-sales-overview.surge.sh
```

---

## 注意

- **個人情報・本物の営業データは含めない**: tool-overview.html はサンプル候補者（5人）の架空データを使用
- **検索エンジン非インデックス**: `<meta name="robots" content="noindex, nofollow">` 設定済み、外部にリンクが漏れても拡散しない
- **Surge アカウント**: 公開資料は `dangi.yuta.business@gmail.com` で運用（複数アカウントあるため `surge whoami` で必ず確認）

---

## 関連ドキュメント

- [../README.md](../README.md) — リポジトリ全体の index
- [../docs/00_ツール起動・確認方法.md](../docs/00_ツール起動・確認方法.md) — `tool/` のローカル起動手順
- [../docs/02_UI設計書.md](../docs/02_UI設計書.md) — 4ペイン + 連絡文 11 シーンの設計
- [../docs/07_工夫したポイント.md](../docs/07_工夫したポイント.md) — 10 点の craftsmanship 整理
