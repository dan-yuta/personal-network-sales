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
| [tool-overview.html](tool-overview.html) | 課題図解の原本 (Hero + Section 0〜8 構成) | 2026-05-15 拡張版に差し替え済 (89KB / 1454行)。Surge 公開版は再デプロイ待ち |
| README.md | このファイル | — |

> `tool-overview.html` は単一ファイル（CDN ベース、ビルド不要）。ブラウザでローカル直接開いても、Surge にデプロイしても同じ見た目になる。
> 14人ぶんの架空候補者データを `tool/data/candidates.json` にシードしているが、本図解内は Pane モック内で代表 3 件を抜粋して図示。

---

## 図解の構成 (拡張版 89KB / Section 0〜8)

```
┌────────────────────────────────────────────────────────┐
│  Hero + ONE-PAGE SUMMARY                                │
│   └─ Notion ← Tool → Anthropic の全体俯瞰              │
├────────────────────────────────────────────────────────┤
│  Section 0. 用語ミニ辞書                                │
│   └─ Pane / API / Notion / Claude / Vision / 楽観更新 他 │
│      (10カードで新人読者向けに専門用語を解説)          │
├────────────────────────────────────────────────────────┤
│  Section 1 (A). そもそも何を解決するツールか            │
│   └─ 現状の困りごと / ありたい姿 (Before / After 形式)  │
├────────────────────────────────────────────────────────┤
│  Section 2 (B). 営業フローとカバーする相手              │
│   └─ 4段階 + 派生紹介の循環 + サブ2段階 (失注/保留)    │
│      + 対象顧客像 (既存知人/紹介/コミュニティ/新規)    │
├────────────────────────────────────────────────────────┤
│  Section 3 (C). 画面構成 — 4ペインのワークスペース      │
│   └─ ブラウザモックアップ + 操作動線 + 責務サマリ      │
├────────────────────────────────────────────────────────┤
│  Section 4 (D). Pane4 タブA — 接触ログを時系列で積む   │
│   └─ 入力フォーム + 履歴UIモック + 楽観更新フロー図   │
├────────────────────────────────────────────────────────┤
│  Section 5 (E). Pane4 タブB — AI に連絡文を下書きさせる │
│   └─ 11シーン + 媒体3種 + Vision解説 + 生成フロー      │
│      + AI に渡す文脈情報リスト + 「送信はしない」設計  │
├────────────────────────────────────────────────────────┤
│  Section 6 (F). 裏側のデータの流れ                      │
│   └─ アーキ図 (PC/ブラウザ/Next.js + Notion + Anthropic) │
│      + 候補者DB × 接触ログDB の 1:N ER 図              │
├────────────────────────────────────────────────────────┤
│  Section 7 (G). 設計・実装で工夫したポイント (代表 6 点) │
│   └─ ① grill-me で1問ずつ詰めた                        │
│      ② 既存 Notion DB を尊重                           │
│      ③ 接触ログ DB だけ追加                            │
│      ④ Pane4 をタブ化                                  │
│      ⑤ 連絡文に Vision 対応                            │
│      ⑥ モック先行 (API 接続前から動く)                 │
├────────────────────────────────────────────────────────┤
│  Section 8. まとめ — 覚えて帰ってほしい3つ              │
│   └─ ① Notion に「載せる」ツール (やめない)            │
│      ② 4ペインで「絞り込み→選択→詳細→次の一手」を1画面 │
│      ③ AI は「最終決定」ではなく「最速の下書き」担当    │
└────────────────────────────────────────────────────────┘
```

> 提出要件4点 (画面キャプチャ / 解決課題 / 工夫 / 苦戦) のうち、
> 「**苦戦したポイント**」セクション H と実画面スクリーンショット
> 挿入は第7回ワーク発表前に追記予定 (進行中)。

---

## デプロイ手順

詳細は [docs/00_ツール起動・確認方法.md](../docs/00_ツール起動・確認方法.md) も参照。

### 初回デプロイ

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

- **個人情報・本物の営業データは含めない**: tool-overview.html は架空候補者データを使用 (`tool/data/candidates.json` シードは 14人、本図解内の Pane モックは代表 3 件を抜粋)
- **検索エンジン非インデックス**: `<meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex">` 設定済み、外部にリンクが漏れても拡散しない
- **Surge アカウント**: 公開資料は `dangi.yuta.business@gmail.com` で運用（複数アカウントあるため `surge whoami` で必ず確認）

---

## 関連ドキュメント

- [../README.md](../README.md) — リポジトリ全体の index
- [../docs/00_ツール起動・確認方法.md](../docs/00_ツール起動・確認方法.md) — `tool/` のローカル起動手順
- [../docs/02_UI設計書.md](../docs/02_UI設計書.md) — 4ペイン + 連絡文 11 シーンの設計
- [../docs/07_工夫したポイント.md](../docs/07_工夫したポイント.md) — 10 点の craftsmanship 整理
