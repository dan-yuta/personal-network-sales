# workspace-ui-kit

採用管理ドメインの **4ペイン Next.js 16 × shadcn/ui ワークスペース雛形**。
受講生向けの動かし方・業種変更手順は README を参照。

## 視覚 SSoT

画面の SSoT（Single Source of Truth = 情報の正本）は `components/workspace/Workspace.tsx`。
**ADR と実装で矛盾したら ADR-003 が正、実装は段階的に追従する**。
（ADR-0015 仕様への追従は別タスクで進める。詳細は ADR-003 §13 R1 参照）

- [ADR 一覧](openspec/decision/) — ペイン責務・デザインシステム・shadcn idiom 等の決定記録

## 同梱スキル

| スキル                      | いつ発動するか                                        | パス                                                            |
| --------------------------- | ----------------------------------------------------- | --------------------------------------------------------------- |
| designing-workspace-ui      | ペイン変更・色変更・コンポーネント追加など UI 作業    | [SKILL.md](.claude/skills/designing-workspace-ui/SKILL.md)      |
| shadcn                      | shadcn 部品の追加・カスタマイズ                       | [SKILL.md](.claude/skills/shadcn/SKILL.md)                      |
| next-best-practices         | Next.js 16 のファイル規約・RSC 境界・async パターン等 | [SKILL.md](.claude/skills/next-best-practices/SKILL.md)         |
| vercel-react-best-practices | React 性能最適化（70 ルール / 8 カテゴリ）            | [SKILL.md](.claude/skills/vercel-react-best-practices/SKILL.md) |

MUST: Next.js のコードを書く前に `node_modules/next/dist/docs/` の該当ドキュメントを読む。学習データではなくバンドル版が正。

## 編集の方針

IMPORTANT: 以下を守ること。

- **UI 変更を始める前に `/designing-workspace-ui` スキルを起動する**。トークン・部品・レイアウトで足りないときは決定木 3a〜3d でユーザー確認し、独断で SSoT を広げない
- **フィールド編集は `components/primitives/Inline*`（shadcn 標準フォーム、border-input + bg-card）を再利用**。鉛筆 / 「編集」ボタン / 編集専用モーダルに逃がさない。業務 Dialog（追加・削除・プレビュー等）は既存パターン踏襲で可
- **shadcn 部品の更新は `npx shadcn@latest add ... --diff` で確認**。`--overwrite` は本人の明示許可なしに使わない（独自 variant が消えるため）

## コード生成ルール

`components/` 配下のファイルを編集する際は、以下を必ず守る。詳しい根拠と Incorrect/Correct ペアは [coding-rules.md](.claude/skills/designing-workspace-ui/references/coding-rules.md) に集約している:

- 子要素の間隔は親で管理する（`flex flex-col gap-*` を使う、`space-y-*` は使わない）
- 部品の見た目を呼び出し側で打ち消さない（色・フォントサイズ・フォントウェイトの `className` 上書きはしない。部品側に variant を追加する）
- 色は役割で名前付けされたトークンを使う（`bg-primary` 等。`bg-blue-500` のような色番号は使わない）
- 正方形の要素には `size-N` を使う（`w-N h-N` ではなく）
- このプロジェクトは shadcn の **base**（Base UI）を使用。カスタムトリガーには `asChild` ではなく `render` を使う
- shadcn の部品（Button / Card / Badge / Dialog 等）が使えるなら、自前の div で代替しない
- UI の変更前に `/designing-workspace-ui` スキルを必ず読む
- 派生 state を Effect で複製しない（レンダーで計算する）。props 変更追従の Effect+setState は避け、リセットは key でリマウント。ユーザー操作起因の副作用は state フラグ+Effect より直接イベントハンドラに置く

## 技術スタック

- Next.js 16 / React 19 / TypeScript（strict）
- Tailwind CSS v4（`@theme` で CSS 変数）
- shadcn/ui（base-nova / `@base-ui/react`）
- lucide-react（アイコン）
- `zod`（ランタイム検証）

## コマンド

```bash
npm run dev          # 開発サーバー起動
npm run build        # 本番ビルド
npm run lint         # ESLint
npm run test         # Vitest スモークテスト
npm run format       # Prettier
npm run check:radius # 角丸ドリフト検出
```

## 配布制約

- `.distignore` で `openspec/` `AGENTS.md` は配布対象外（受講生の Gitea リポジトリに含まれない）
- `CLAUDE.md` と `.claude/skills/*` は配布される（受講生環境の AI が読む）
- 配布手順は親リポジトリの `managing-ads-gitea` スキルに従う

## UX 機能リファレンス (本リポジトリ独自)

100 人運用での日常使いやすさのために以下を実装済み。場所と「いつ動くか」だけ
押さえておけば再現可能。

| 機能 | 場所 | いつ動くか |
|---|---|---|
| 最終接触からの相対表記 (12日前 / 3週間前 / 1ヶ月前) | [`lib/computed/lastContact.ts`](lib/computed/lastContact.ts) | Pane2 行 (3 行目) と Pane3 ヘッダーで常時表示 |
| 接触ログ追加のクイック日付ボタン (今日/昨日/一昨日) | [`components/workspace/CandidateDetailPane.tsx`](components/workspace/CandidateDetailPane.tsx) `QuickDateButtons` | Pane4 接触ログタブの新規追加フォーム |
| Pane2 ステージグループの折りたたみ | [`components/workspace/CandidateListPane.tsx`](components/workspace/CandidateListPane.tsx) `StageGroup` | 全 6 ステージ、開閉 state は Workspace の `stageOpenMap` で保持。**仕様**: 畳まれたステージは Base UI Collapsible が DOM から remove するため D&D のドロップターゲットにならない (ユーザーが手動で開いてからドロップする運用) |
| Pane3 カードの折りたたみ | [`components/workspace/CandidateDashboardPane.tsx`](components/workspace/CandidateDashboardPane.tsx) | EvaluationCard / RecruitingConditionsCard、開閉 state は Workspace で保持 (候補者切替で維持) |
| 検索ヒット黄色ハイライト | [`components/workspace/HighlightedText.tsx`](components/workspace/HighlightedText.tsx) + [`lib/computed/searchHighlight.ts`](lib/computed/searchHighlight.ts) | Pane2 候補者行の name / source |
| アクション Undo (軽量 Toast) | [`components/workspace/Toaster.tsx`](components/workspace/Toaster.tsx) | archiveCandidate / restoreCandidate / moveCandidate (ステージ跨ぎのみ) / deletePosition / deleteDepartment |
| キーボードショートカット | Workspace useEffect + [`ShortcutsHelpDialog.tsx`](components/workspace/ShortcutsHelpDialog.tsx) | `↑↓` 候補切替 / `j k` 同上 / `/` 検索 / `1-6` ステージ / `Esc` 解除 / `?` ヘルプ。設定ダイアログからもアクセス可 |
| 未保存インジケータ + 自動保存 (800ms debounce) | [`components/primitives/InlineTextField.tsx`](components/primitives/InlineTextField.tsx) | Pane3 のすべての InlineTextField (氏名・フリガナ・接触経路・連絡先など) |
| 評価 4 軸のクイック編集 | [`components/workspace/CandidateDashboardPane.tsx`](components/workspace/CandidateDashboardPane.tsx) `AxisScoreRow` editable | Pane3「現時点評価 (4軸)」カード、星クリックで 1-5 設定、× でリセット |
| 優先度 + 選択基準ガイド (Notion 同期準備) | [`components/primitives/PrioritySelectField.tsx`](components/primitives/PrioritySelectField.tsx) + [`lib/labels.ts`](lib/labels.ts) `PRIORITY_DESCRIPTIONS` | Pane3 営業条件カードで [高][中][低] 切替、フォロー密度ベースの基準目安を表示、ソートキーにも追加 (Pane2 のドットマーカーは 2026-05-26 撤回: 視認性低いため) |
| 次回アクションメモ + バック人脈 | Pane3 各カード InlineTextField | Notion DB の「次回アクション」「バック人脈」列と同期予定 |

### InlineTextField / InlineTextareaField の挙動 (controlled、Base UI Input + ref forward)

- controlled (`value` + `onChange`、key={value} は撤回済み)
- 編集中で `draft !== value` の間は input 右端に rose ドットを表示
- 最後の打鍵から 800ms 経過で `onSave(current)` を発火、フォーカスは維持
- Enter / Tab / blur で即時 save、Esc で取り消し
- Pane3 編集中に Pane2 で別候補者選択しても 5/25 で対処済の blur 経由保存が
  動くため、編集ロスは発生しない

**IME 中 blur の二段ガード** (2026-05-26 確定):
1. `composingRef` ガード: compositionstart 〜 compositionend 中の blur は保存しない (Firefox 等の挙動対応)
2. `lastCompositionEndAt` 時間差ガード (50ms): Chrome は document.activeElement.blur() を呼ぶと **blur 直前に compositionend を自動発火** して IME を強制確定する。これで composingRef だけだとガードを通過してしまうため、「compositionend → 直後 50ms 以内の blur」は IME 自動 commit と見なして保存をブロック。ユーザーの「変換確定 (Enter) → Tab で blur」(典型 >100ms) は通る境界。

### キーボードショートカットの実装規約

- `Workspace.tsx` の useEffect で `window.keydown` を listen
- 入力欄 (INPUT/TEXTAREA/SELECT/`role=combobox|dialog|menu`) では Esc 以外
  すべて素通り
- IME 変換中 (`isComposing` / `keyCode === 229`) は全 shortcut スキップ
- 修飾キー付き (Cmd/Ctrl/Alt) はブラウザのタブ切替なので素通り (例外: ? = Shift+/)
- 候補者切替 (↑↓) は `candidateGroups` の flat list を使い末尾でクランプ

## Notion DB との同期 (Phase 3 で接続予定)

接続先 DB: `https://www.notion.so/3409452b6de2494997f9b4275be266f1` (営業候補リスト)

Phase 1 (現状) はモック実装で、`tool/data/candidates.json` シードを zod parse で
読み込む。各 Profile フィールドの Notion 側対応関係:

| アプリ側 (Profile) | Notion 側 | 補足 |
|---|---|---|
| name | 顧客名 | アプリでは個人名のみ、Notion の「顧客企業名」は別途必要なら追加検討 |
| furigana | (Notion になし) | アプリ独自、五十音ソート用 |
| birthday | (Notion になし) | アプリ独自 |
| source | 間柄 | Notion 側は別 DB relation、アプリでは自由テキストで簡略化 |
| email / phone / address | Email / 連絡先 / 住所 | 直結 |
| recruiter | 担当者 | Notion 側 Person、アプリは自由テキスト (Phase 3 で User 連携検討) |
| desiredSalaryMin / Max | (Notion になし) | アプリ独自、想定取引規模 |
| availableStartDate | 次回アクション期限 | 直結 |
| **nextActionMemo** | **次回アクション** | 2026-05-25 追加 |
| **priority** | **優先度** (高/中/低) | 2026-05-25 追加、Notion side select と整合 |
| **backNetwork** | **バック人脈** | 2026-05-25 追加 |
| careerText / motivationFull | 備考 / 進捗詳細 | アプリ側はテキスト 2 つに分離 |
| stage | 進捗状況 | 6 種類で完全一致 (未連絡/アプローチ中/商談中/契約/失注/保留) |

未取り込み (Phase 3 検討):
- 名刺 (file) / 担当者 (Person) / 間柄 (relation) / 親レコード (relation, 自己) /
  リンク URL / 郵便番号

Notion への書き込みは厳禁 (Phase 1 ではアプリ単体運用、Phase 3 で同期実装時に
適切な権限分離を検討)。

## やらないこと

- DB 接続・認証（次フェーズ）
- `react-beautiful-dnd`（廃止ライブラリ）への置き換え
- Toast ライブラリ追加 (sonner/radix-toast 等)。自前 [`Toaster.tsx`](components/workspace/Toaster.tsx) で足りる範囲は依存追加しない
- Notion DB の編集 (Phase 1 はアプリ単体、Phase 3 同期時も書き込み先は十分検討してから)
