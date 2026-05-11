"use client";

/**
 * Pane 4: 次の一手領域（タブ化）。
 *
 * 設計（docs/02_UI設計書.md 参照）に従い、Pane4 をタブ切替式に再実装。
 *   - タブA: 接触ログ（過去の接触履歴 + 新規ログ追加フォーム）
 *   - タブB: 連絡文作成（AIによる連絡文ドラフト生成）
 *
 * 現フェーズはモック実装。Notion API / Anthropic API は未接続で、
 * UI と動作感だけ提示する。本格実装は Phase 2-3 で行う。
 */

import { useState } from "react";

import { type Candidate } from "@/lib/schema";
import { Pane4Toggle } from "@/components/workspace/Pane4Toggle";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CandidateDetailPaneProps = {
  candidate: Candidate;
  pane4Open: boolean;
  onTogglePane4: () => void;
};

type TabId = "log" | "draft";

export function CandidateDetailPane({
  candidate,
  pane4Open,
  onTogglePane4,
}: CandidateDetailPaneProps) {
  const [activeTab, setActiveTab] = useState<TabId>("log");

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col border-l border-border bg-background",
        "overflow-hidden transition-[width] duration-200 ease-linear",
        pane4Open ? "w-[400px]" : "w-12",
      )}
    >
      {pane4Open ? (
        <>
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
            <h2 className="flex-1 truncate text-sm font-semibold text-foreground">
              {candidate.profile.name || "候補者"} さんへの次の一手
            </h2>
            <Pane4Toggle open={pane4Open} onToggle={onTogglePane4} />
          </header>

          {/* タブヘッダー */}
          <div
            role="tablist"
            aria-label="Pane4 タブ切替"
            className="flex border-b border-border bg-muted/30"
          >
            <TabButton
              tabId="log"
              activeTab={activeTab}
              onSelect={setActiveTab}
              label="接触ログ"
            />
            <TabButton
              tabId="draft"
              activeTab={activeTab}
              onSelect={setActiveTab}
              label="連絡文作成"
            />
          </div>

          <ScrollArea className="min-h-0 flex-1">
            {activeTab === "log" ? (
              <ContactLogTab candidate={candidate} />
            ) : (
              <DraftMessageTab candidate={candidate} />
            )}
          </ScrollArea>
        </>
      ) : (
        <div className="flex h-12 shrink-0 items-center justify-center border-b border-border">
          <Pane4Toggle open={pane4Open} onToggle={onTogglePane4} />
        </div>
      )}
    </aside>
  );
}

// ===== タブボタン =====

function TabButton({
  tabId,
  activeTab,
  onSelect,
  label,
}: {
  tabId: TabId;
  activeTab: TabId;
  onSelect: (id: TabId) => void;
  label: string;
}) {
  const active = activeTab === tabId;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={() => onSelect(tabId)}
      className={cn(
        "flex-1 px-4 py-2.5 text-sm transition-colors",
        "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        active
          ? "border-b-2 border-primary font-semibold text-foreground"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

// ===== タブA: 接触ログ（モック） =====

type MockLogEntry = {
  id: string;
  date: string;
  method: string;
  content: string;
};

// 候補者ごとに異なるモックログを返す簡易データ。
function getMockLogs(candidateId: string): MockLogEntry[] {
  const dataset: Record<string, MockLogEntry[]> = {
    c1: [
      {
        id: "log-c1-1",
        date: "2026-05-08",
        method: "LINE",
        content: "同期会の写真をシェア。元気そうだったので近況伺いも",
      },
    ],
    c2: [
      {
        id: "log-c2-1",
        date: "2026-05-10",
        method: "電話",
        content: "役員会で導入検討と返答。次回は現場責任者の佐藤さん同席で訪問予定",
      },
      {
        id: "log-c2-2",
        date: "2026-05-08",
        method: "メール",
        content: "提案資料を送付",
      },
      {
        id: "log-c2-3",
        date: "2026-05-05",
        method: "LINE",
        content: "初回挨拶。来週オンライン会議の打診",
      },
    ],
    c3: [
      {
        id: "log-c3-1",
        date: "2026-05-09",
        method: "メール",
        content: "提案書のドラフトを共有。来週返答予定",
      },
    ],
    c4: [
      {
        id: "log-c4-1",
        date: "2026-05-07",
        method: "訪問",
        content: "ランチMTG。次回紹介可能な経営者を聞き出し済み",
      },
    ],
    c5: [
      {
        id: "log-c5-1",
        date: "2026-05-06",
        method: "オンライン会議",
        content: "初回挨拶 30分。次回は具体提案フェーズへ",
      },
    ],
  };
  return dataset[candidateId] ?? [];
}

function ContactLogTab({ candidate }: { candidate: Candidate }) {
  const logs = getMockLogs(candidate.id);

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* 新規ログ追加フォーム（モック・送信は未実装） */}
      <section
        aria-labelledby="log-add-heading"
        className="rounded-lg border border-border bg-card p-3"
      >
        <h3
          id="log-add-heading"
          className="mb-3 text-xs font-semibold text-muted-foreground"
        >
          + 新規ログを追加
        </h3>
        <div className="flex flex-col gap-2 text-sm">
          <label className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-xs text-muted-foreground">
              日付
            </span>
            <input
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="flex-1 rounded border border-input bg-background px-2 py-1 text-sm"
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-xs text-muted-foreground">
              手段
            </span>
            <select
              defaultValue="電話"
              className="flex-1 rounded border border-input bg-background px-2 py-1 text-sm"
            >
              <option>電話</option>
              <option>メール</option>
              <option>LINE</option>
              <option>訪問</option>
              <option>オンライン会議</option>
              <option>SNS</option>
              <option>その他</option>
            </select>
          </label>
          <label className="flex items-start gap-2">
            <span className="mt-1 w-16 shrink-0 text-xs text-muted-foreground">
              内容
            </span>
            <textarea
              rows={2}
              placeholder="例: 商品説明、興味あり"
              className="flex-1 rounded border border-input bg-background px-2 py-1 text-sm"
            />
          </label>
          <div className="mt-1 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm">
              キャンセル
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => alert("保存（モック）: 実装は Phase 3 で")}
            >
              保存
            </Button>
          </div>
        </div>
      </section>

      {/* 履歴 */}
      <section aria-labelledby="log-history-heading" className="flex flex-col gap-2">
        <h3
          id="log-history-heading"
          className="text-xs font-semibold text-muted-foreground"
        >
          履歴（新→旧）
        </h3>
        {logs.length === 0 ? (
          <p className="rounded-md border border-dashed border-border bg-muted/30 p-4 text-center text-xs text-muted-foreground">
            まだ接触ログがありません
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {logs.map((log) => (
              <li
                key={log.id}
                className="rounded-md border border-border bg-card p-3"
              >
                <div className="mb-1 flex items-center gap-2 text-xs">
                  <span className="font-mono text-muted-foreground">
                    {log.date}
                  </span>
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-primary">
                    {log.method}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-foreground">
                  {log.content}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ===== タブB: 連絡文作成（モック） =====

const SCENE_OPTIONS = [
  "初回声かけ（既存知人）",
  "初回声かけ（新規の人）",
  "フォローアップ",
  "紹介依頼",
  "お礼",
  "再アプローチ",
] as const;

const MEDIUM_OPTIONS = ["メール", "LINE", "電話用トーク台本"] as const;

// シーン+媒体ごとのサンプル文（モック生成結果として使う）。
function getMockDraft(
  candidate: Candidate,
  scene: string,
  medium: string,
  note: string,
): string {
  const name = candidate.profile.name || "○○";
  if (medium === "メール") {
    return [
      `件名: ご無沙汰しております（${candidate.profile.source || "同期会"} の段木）`,
      ``,
      `${name} 様`,
      ``,
      `ご無沙汰しております。${candidate.profile.source || "○○同期会"}でお会いした段木です。`,
      note
        ? `${note}の件でご連絡いたしました。`
        : `直近の近況伺いも兼ねまして、ご連絡いたしました。`,
      ``,
      `もしご都合よろしければ、来週あたりにお時間 30 分ほどいただけませんか。`,
      ``,
      `何卒よろしくお願いいたします。`,
      `段木`,
    ].join("\n");
  }
  if (medium === "LINE") {
    return [
      `${name}さん お久しぶりです、段木です。`,
      note
        ? `${note}の件で、ちょっとご連絡しました。`
        : `急にすみません、近況伺いです。`,
      `来週どこかでお茶でもいかがですか？`,
    ].join("\n");
  }
  // 電話用トーク台本
  return [
    `【冒頭】`,
    `「${name}さん、お久しぶりです、段木です。今ちょっとお時間よろしいですか？」`,
    ``,
    `【本題】`,
    note
      ? `「実は、${note}の件で少しお話しできればと思いまして」`
      : `「最近どうされてるかなと思いまして、近況伺いのお電話です」`,
    ``,
    `【締め】`,
    `「次の機会、来週あたりに少しお時間いただけませんか？」`,
  ].join("\n");
}

function DraftMessageTab({ candidate }: { candidate: Candidate }) {
  const [scene, setScene] = useState<string>(SCENE_OPTIONS[0]);
  const [medium, setMedium] = useState<string>(MEDIUM_OPTIONS[0]);
  const [note, setNote] = useState<string>("");
  const [output, setOutput] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = () => {
    setGenerating(true);
    // モック: 0.3秒の遅延を入れて生成感を出す
    setTimeout(() => {
      setOutput(getMockDraft(candidate, scene, medium, note));
      setGenerating(false);
    }, 300);
  };

  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard?.writeText(output);
    alert("クリップボードにコピーしました（モック）");
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* 入力 */}
      <section
        aria-labelledby="draft-input-heading"
        className="rounded-lg border border-border bg-card p-3"
      >
        <h3
          id="draft-input-heading"
          className="mb-3 text-xs font-semibold text-muted-foreground"
        >
          入力
        </h3>
        <div className="flex flex-col gap-2 text-sm">
          <label className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-xs text-muted-foreground">
              シーン
            </span>
            <select
              value={scene}
              onChange={(e) => setScene(e.target.value)}
              className="flex-1 rounded border border-input bg-background px-2 py-1 text-sm"
            >
              {SCENE_OPTIONS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-xs text-muted-foreground">
              媒体
            </span>
            <select
              value={medium}
              onChange={(e) => setMedium(e.target.value)}
              className="flex-1 rounded border border-input bg-background px-2 py-1 text-sm"
            >
              {MEDIUM_OPTIONS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <label className="flex items-start gap-2">
            <span className="mt-1 w-16 shrink-0 text-xs text-muted-foreground">
              補足
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="例: 来週の展示会の件で"
              className="flex-1 rounded border border-input bg-background px-2 py-1 text-sm"
            />
          </label>
          <div className="mt-1 flex justify-end">
            <Button
              type="button"
              size="sm"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? "生成中..." : "生成する"}
            </Button>
          </div>
        </div>
      </section>

      {/* 出力 */}
      {output && (
        <section
          aria-labelledby="draft-output-heading"
          className="rounded-lg border border-border bg-card p-3"
        >
          <h3
            id="draft-output-heading"
            className="mb-3 text-xs font-semibold text-muted-foreground"
          >
            生成結果（モック）
          </h3>
          <pre className="whitespace-pre-wrap rounded border border-input bg-background p-3 text-xs leading-relaxed text-foreground">
            {output}
          </pre>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGenerate}
            >
              もっと丁寧
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGenerate}
            >
              もっとカジュアル
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGenerate}
            >
              もっと短く
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGenerate}
            >
              再生成
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={handleCopy}>
              コピー
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                alert("接触ログとして保存（モック）: 実装は Phase 3 で")
              }
            >
              接触ログとして保存
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
