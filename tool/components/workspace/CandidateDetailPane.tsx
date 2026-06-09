"use client";

/**
 * Pane 4: 次の一手領域（タブ化）。
 *
 * 設計（docs/02_UI設計書.md 参照）に従い、Pane4 をタブ切替式に再実装。
 *   - タブA: 接触ログ（過去の接触履歴 + 新規ログ追加フォーム）
 *   - タブB: 連絡文作成（AIによる連絡文ドラフト生成）
 *
 * タブA（接触ログ）は Notion 接触ログDB と接続済み（表示・追加・最終連絡日同期）。
 * タブB（連絡文作成）の AI 生成はまだモック（Anthropic 接続は発展課題=Phase E）。
 */

import {
  useEffect,
  useMemo,
  useOptimistic,
  useState,
  useTransition,
} from "react";
import { Clock, PlusCircle, Sparkles, type LucideIcon } from "lucide-react";

import { type Candidate } from "@/lib/schema";
import {
  CONTACT_METHOD_THEME,
  CONTACT_METHOD_THEME_DEFAULT,
} from "@/lib/labels";
import { listContactLogsAction, addContactLogAction } from "@/app/actions";
import { useToast } from "@/components/workspace/Toaster";
import { dateNDaysAgo } from "@/lib/computed/dateOffsets";
import { Pane4Toggle } from "@/components/workspace/Pane4Toggle";
import { InlineDateField } from "@/components/primitives";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CandidateDetailPaneProps = {
  candidate: Candidate;
  pane4Open: boolean;
  onTogglePane4: () => void;
  /** 接触ログ追加成功時に呼ぶ。Workspace 側で候補者の「最終連絡日」を即時更新する（D5）。 */
  onContactLogAdded: (candidateId: string, date: string) => void;
};

type TabId = "log" | "draft";

export function CandidateDetailPane({
  candidate,
  pane4Open,
  onTogglePane4,
  onContactLogAdded,
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
              Icon={Clock}
            />
            <TabButton
              tabId="draft"
              activeTab={activeTab}
              onSelect={setActiveTab}
              label="連絡文作成"
              Icon={Sparkles}
            />
          </div>

          <ScrollArea className="min-h-0 flex-1">
            {/* key={activeTab} で remount → tw-animate-css の fade-in が発火。
                タブ切替時のフェードで「コンテンツが切り替わった」感を出す。
                motion-reduce 設定のユーザーにはアニメーションを切る。 */}
            <div
              key={activeTab}
              className="animate-in fade-in duration-150 motion-reduce:animate-none"
            >
              {activeTab === "log" ? (
                // key={candidate.id} で候補者切替時に remount → ログ再取得＋
                // フォーム初期化（接触ログの取得・追加状態を候補者ごとに分離）。
                <ContactLogTab
                  key={candidate.id}
                  candidate={candidate}
                  onContactLogAdded={onContactLogAdded}
                />
              ) : (
                <DraftMessageTab candidate={candidate} />
              )}
            </div>
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
  Icon,
}: {
  tabId: TabId;
  activeTab: TabId;
  onSelect: (id: TabId) => void;
  label: string;
  Icon: LucideIcon;
}) {
  const active = activeTab === tabId;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={() => onSelect(tabId)}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 px-4 py-2.5 text-sm transition-colors",
        "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        active
          ? "border-b-2 border-primary bg-primary/5 font-semibold text-primary"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      )}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      {label}
    </button>
  );
}

// ===== タブA: 接触ログ（Notion 連携済み） =====
//
// 表示は listContactLogsAction で Notion 接触ログDB から取得（新→旧）、
// 追加は addContactLogAction（最終連絡日も同期）。useOptimistic で即時反映する。

const CONTACT_METHOD_OPTIONS = [
  "電話",
  "メール",
  "LINE",
  "訪問",
  "オンライン会議",
  "SNS",
  "その他",
] as const;
type ContactMethod = (typeof CONTACT_METHOD_OPTIONS)[number];

/**
 * クイック日付ボタン群。「先週の打ち合わせを翌週入力する」が運用上多いため、
 * カレンダーから日を選ぶより 1 クリックで日付確定できる動線を最優先で並べる。
 * input[type=date] (右隣) は任意日選択のフォールバックとして残す。
 */
function QuickDateButtons({
  value,
  onChange,
  now,
}: {
  value: string;
  onChange: (v: string) => void;
  /** テスト用に「今日」を外から渡せるようにする (本番では未指定で OK) */
  now?: Date;
}) {
  // 今日/昨日/一昨日 は now を変えるたびに再計算する必要があるが、now は
  // 通常 props で固定なので 1 度だけ計算すれば十分。
  const presets = useMemo(
    () =>
      [
        { label: "今日", value: dateNDaysAgo(0, now) },
        { label: "昨日", value: dateNDaysAgo(1, now) },
        { label: "一昨日", value: dateNDaysAgo(2, now) },
      ] as const,
    [now],
  );

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {presets.map((p) => {
        const active = value === p.value;
        return (
          <button
            key={p.label}
            type="button"
            onClick={() => onChange(p.value)}
            aria-pressed={active}
            className={cn(
              "rounded border px-2 py-0.5 text-xs font-medium transition-colors",
              "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              active
                ? "border-primary bg-primary/15 text-primary"
                : "border-input bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

type DisplayLog = {
  id: string;
  date: string;
  method: string;
  content: string;
};

function ContactLogTab({
  candidate,
  onContactLogAdded,
}: {
  candidate: Candidate;
  onContactLogAdded: (candidateId: string, date: string) => void;
}) {
  const { push: pushToast } = useToast();

  // Notion 接触ログDB から取得した履歴（新→旧）。null = ロード中。
  const [logs, setLogs] = useState<DisplayLog[] | null>(null);
  const [isPending, startTransition] = useTransition();
  // 楽観的追加: 保存中は新ログを先頭に即時表示し、transition 完了で base(logs) に同期。
  const [optimisticLogs, addOptimisticLog] = useOptimistic(
    logs ?? [],
    (cur: DisplayLog[], item: DisplayLog) => [item, ...cur],
  );

  // 候補者の接触ログを取得（key={candidate.id} で候補者ごとに mount → 1 回実行）。
  useEffect(() => {
    let cancelled = false;
    listContactLogsAction(candidate.id)
      .then((rows) => {
        if (cancelled) return;
        setLogs(
          rows.map((r) => ({
            id: r.id,
            date: r.date,
            method: r.method,
            content: r.content,
          })),
        );
      })
      .catch(() => {
        if (cancelled) return;
        setLogs([]);
        pushToast({ message: "接触ログの取得に失敗しました" });
      });
    return () => {
      cancelled = true;
    };
  }, [candidate.id, pushToast]);

  // 新規ログ追加フォームの状態。
  // 「先週の打ち合わせを思い出して翌週入力する」が現実的な運用シナリオなので、
  // デフォルトは「今日」、ただし変更されたら保存後リセットで「今日」に戻す。
  const todayIso = dateNDaysAgo(0);
  const [date, setDate] = useState<string>(todayIso);
  const [method, setMethod] = useState<ContactMethod>("電話");
  const [content, setContent] = useState<string>("");

  const resetForm = () => {
    setDate(dateNDaysAgo(0));
    setMethod("電話");
    setContent("");
  };

  // 保存: 楽観的に履歴へ追加 → Notion へ書込 → 実 ID 付き最新一覧で確定。
  // 失敗時は base(logs) を変えないので transition 終了で楽観追加が自動的に消える。
  const handleSave = () => {
    const trimmed = content.trim();
    if (!date || !trimmed) return;
    const savedDate = date;
    const savedMethod = method;
    const optimistic: DisplayLog = {
      id: `temp-${crypto.randomUUID()}`,
      date: savedDate,
      method: savedMethod,
      content: trimmed,
    };
    resetForm();
    startTransition(async () => {
      addOptimisticLog(optimistic);
      try {
        await addContactLogAction({
          candidateId: candidate.id,
          date: savedDate,
          method: savedMethod,
          content: trimmed,
        });
        const rows = await listContactLogsAction(candidate.id);
        setLogs(
          rows.map((r) => ({
            id: r.id,
            date: r.date,
            method: r.method,
            content: r.content,
          })),
        );
        // Pane2/Pane3 の「最終接触」バッジを即時更新（D5）。
        onContactLogAdded(candidate.id, savedDate);
      } catch {
        pushToast({ message: "接触ログの保存に失敗しました" });
      }
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* 新規ログ追加フォーム（保存で Notion 接触ログDB に永続化） */}
      <section
        aria-labelledby="log-add-heading"
        className="rounded-lg border border-primary/30 bg-primary/5 p-3"
      >
        <h3
          id="log-add-heading"
          className="mb-3 flex items-center gap-1.5 text-xs font-bold text-primary"
        >
          <PlusCircle aria-hidden="true" className="size-3.5" />
          新規ログを追加
        </h3>
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex items-start gap-2">
            <span className="mt-1 w-16 shrink-0 text-xs text-muted-foreground">
              日付
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              {/* クイック日付ボタン: 今日 / 昨日 / 一昨日。
                  接触ログ追加は最頻アクションで「先週の打ち合わせを翌週入力」
                  シナリオが多い。カレンダーから選ぶより 1 クリックの方が速い。 */}
              <QuickDateButtons value={date} onChange={setDate} />
              {/* 任意日付選択用のカレンダー (Pane3 と統一: Base UI Popover +
                  Calendar)。ネイティブ input[type=date] は OS ごとに見た目が
                  バラつくため、Pane3 で使っている InlineDateField に揃える。 */}
              <InlineDateField
                value={date}
                onSave={setDate}
                ariaLabel="日付 (カレンダーから選択)"
              />
            </div>
          </div>
          <label className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-xs text-muted-foreground">
              手段
            </span>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as ContactMethod)}
              className="flex-1 rounded border border-input bg-background px-2 py-1 text-sm"
            >
              {CONTACT_METHOD_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-start gap-2">
            <span className="mt-1 w-16 shrink-0 text-xs text-muted-foreground">
              内容
            </span>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={2}
              placeholder="例: 商品説明、興味あり"
              className="flex-1 rounded border border-input bg-background px-2 py-1 text-sm"
            />
          </label>
          <div className="mt-1 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetForm}
            >
              キャンセル
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!date || !content.trim() || isPending}
              onClick={handleSave}
            >
              {isPending ? "保存中..." : "保存"}
            </Button>
          </div>
          {/* 「今日」がデフォルトでも、ユーザーが他の日付を選んだら保存ボタンの
              すぐ近くで現在選択中の日付を可視化する (今日以外のときだけ表示)。 */}
          {date !== todayIso && (
            <p
              className="text-right text-[10px] text-muted-foreground"
              aria-live="polite"
            >
              {date} で保存します
            </p>
          )}
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
        {logs === null ? (
          <p className="rounded-md border border-dashed border-border bg-muted/30 p-4 text-center text-xs text-muted-foreground">
            読み込み中…
          </p>
        ) : optimisticLogs.length === 0 ? (
          <p className="rounded-md border border-dashed border-border bg-muted/30 p-4 text-center text-xs text-muted-foreground">
            まだ接触ログがありません
          </p>
        ) : (
          // タイムライン表示: 左に縦線を 1 本通し、各ログの左端にドット (手段色) を打つ。
          // 時系列の連続性が視覚的に伝わりやすい。
          <ol className="relative ml-3 flex flex-col gap-3 border-l-2 border-border pl-5">
            {optimisticLogs.map((log) => {
              const methodTheme =
                CONTACT_METHOD_THEME[log.method] ?? CONTACT_METHOD_THEME_DEFAULT;
              return (
                <li key={log.id} className="relative">
                  {/* タイムラインの起点ドット (手段色を反映、縦線にめり込ませる)
                      methodTheme.text = "text-XXX-700" を bg-current で背景化することで、
                      Tailwind の JIT が動的クラス名を検出できない問題を回避 */}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute top-2 left-[-1.65rem] size-3 rounded-full border-2 border-background bg-current",
                      methodTheme.text,
                    )}
                  />
                  <div className="rounded-md border border-border bg-card p-3">
                    <div className="mb-1 flex items-center gap-2 text-xs">
                      <span className="font-mono text-muted-foreground">
                        {log.date}
                      </span>
                      <span
                        className={cn(
                          "rounded px-2 py-0.5 font-medium",
                          methodTheme.bg,
                          methodTheme.text,
                        )}
                      >
                        {log.method}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-foreground">
                      {log.content}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}

// ===== タブB: 連絡文作成（モック） =====

const SCENE_OPTIONS = [
  "初回声かけ（既存知人）",
  "初回声かけ（新規の人）",
  "紹介依頼",
  "フォローアップ",
  "提案・サービス紹介",
  "商談・条件すり合わせ",
  "クロージング・意思確認",
  "契約締結・条件確定",
  "お礼",
  "派生紹介の依頼",
  "再アプローチ",
] as const;

const MEDIUM_OPTIONS = ["メール", "LINE", "電話用トーク台本"] as const;

// シーンごとに「件名」「導入文」「本題テンプレート」「締め」を切り替える。
// 営業フェーズ全体（初回〜契約）+ 派生紹介の連鎖までカバーする 11 シーン用のモック。
type SceneTemplate = {
  subjectSuffix: string;
  emailLead: string;
  emailBody: (note: string) => string;
  emailClose: string;
  lineLead: string;
  lineBody: (note: string) => string;
  lineClose: string;
  talkOpening: string;
  talkBody: (note: string) => string;
  talkClose: string;
};

function getSceneTemplate(scene: string, name: string, source: string): SceneTemplate {
  switch (scene) {
    case "提案・サービス紹介":
      return {
        subjectSuffix: "ご提案のご案内",
        emailLead: `先日はお時間をいただきありがとうございました。`,
        emailBody: (note) =>
          note
            ? `${note}について、弊社サービスでお役に立てそうなポイントを資料にまとめました。`
            : `お話しした課題への解決策として、弊社サービスのご紹介資料をお送りいたします。要点は次の3つです。`,
        emailClose: `30 分ほどで概要をご説明できます。来週のご都合いかがでしょうか。`,
        lineLead: `${name}さん、先日はありがとうございました。`,
        lineBody: (note) =>
          note ? `${note}の件、簡単な提案資料できました。` : `お話伺った件、提案資料できたので近々お見せできればです。`,
        lineClose: `15 分くらいで概要ご説明できます。来週どこかいかがですか？`,
        talkOpening: `「${name}さん、先日はお時間ありがとうございました。今回は具体的なご提案でお電話しました」`,
        talkBody: (note) =>
          note
            ? `「${note}の件について、3つのポイントでご提案させてください」`
            : `「先日伺った課題への解決策として、要点3つに絞ってご説明します」`,
        talkClose: `「詳細は資料をお送りしますので、30 分ほどお時間いただけませんか」`,
      };
    case "商談・条件すり合わせ":
      return {
        subjectSuffix: "条件のすり合わせについて",
        emailLead: `先日はご提案にお目通しいただきありがとうございました。`,
        emailBody: (note) =>
          note
            ? `${note}に関して、いくつか論点を整理させてください。①導入時期 ②ご予算感 ③意思決定の流れ、の3点です。`
            : `導入に向けて、①開始時期 ②ご予算感 ③意思決定の流れ、の3点について確認させてください。`,
        emailClose: `次回のお打ち合わせで擦り合わせできれば幸いです。候補日を 2〜3 案いただけますでしょうか。`,
        lineLead: `${name}さん、ご検討ありがとうございます。`,
        lineBody: (note) =>
          note ? `${note}の件、確認させてほしいポイントが3点だけあります。` : `条件すり合わせのため、3点だけ確認させてください。`,
        lineClose: `次回お会いするときに整理できればと思います。候補日もらえますか？`,
        talkOpening: `「${name}さん、お時間ありがとうございます。先日のご提案、ご検討状況いかがでしょうか」`,
        talkBody: (note) =>
          note
            ? `「${note}の件で、確認したい論点が3つあります。①導入時期 ②ご予算感 ③意思決定の流れ」`
            : `「条件のすり合わせとして、3点ご確認させてください。①導入時期 ②ご予算 ③決裁の流れ」`,
        talkClose: `「次回のお打ち合わせで詰められればと思います。来週ご都合いかがでしょうか」`,
      };
    case "クロージング・意思確認":
      return {
        subjectSuffix: "ご導入のご意向確認",
        emailLead: `何度かお打ち合わせのお時間をいただきありがとうございます。`,
        emailBody: (note) =>
          note
            ? `${note}を踏まえ、ご導入のご意向について現時点でのお考えをお聞かせいただけますでしょうか。判断材料に不足があれば追加でご用意いたします。`
            : `これまでのご検討内容を踏まえ、ご導入の方向性について現時点のお考えを伺えますと幸いです。ご不明点があれば遠慮なくお知らせください。`,
        emailClose: `差し支えなければ、今週中にご返答いただけますと、開始時期の調整がスムーズです。`,
        lineLead: `${name}さん、お世話になっております。`,
        lineBody: (note) =>
          note
            ? `${note}の件、ご導入の方向で進められそうでしょうか？判断材料に足りないものがあれば教えてください。`
            : `ご導入のご意向について、現時点での感触を教えていただけますか？`,
        lineClose: `今週中にお返事もらえると、開始時期の調整しやすいです。`,
        talkOpening: `「${name}さん、お世話になっております。本日はご導入のご意向について確認のお電話です」`,
        talkBody: (note) =>
          note
            ? `「${note}の件、現時点での方向感を率直にお聞かせください。判断材料が不足していれば追加でご用意します」`
            : `「これまでのご検討内容を踏まえ、ご導入の方向性について現時点のお考えを伺えますか」`,
        talkClose: `「もしお進めいただけるなら、今週中にご返答いただけると開始時期の調整がしやすいです」`,
      };
    case "契約締結・条件確定":
      return {
        subjectSuffix: "契約条件のご確認と契約書送付について",
        emailLead: `この度はご導入のご決定をいただき、誠にありがとうございます。`,
        emailBody: (note) =>
          note
            ? `${note}を最終条件として整理いたしました。契約書ドラフトを添付いたします。開始日・支払条件・担当窓口についてご確認ください。`
            : `合意事項を契約書ドラフトに反映いたしました。添付の通りで相違なければ、押印手続きにお進みいただけますと幸いです。`,
        emailClose: `ご不明点があればお気軽にお知らせください。開始後の窓口は引き続き私が担当いたします。`,
        lineLead: `${name}さん、ご決定ありがとうございます！`,
        lineBody: (note) =>
          note ? `${note}を最終条件として契約書ドラフトをお送りしました。ご確認お願いします。` : `契約書ドラフトをメールでお送りしました。ご確認お願いします。`,
        lineClose: `開始後も引き続きよろしくお願いいたします。`,
        talkOpening: `「${name}さん、この度はご導入のご決定、誠にありがとうございます」`,
        talkBody: (note) =>
          note
            ? `「${note}を最終条件として契約書ドラフトをご用意しました。開始日・支払条件・担当窓口の3点をご確認いただければと思います」`
            : `「合意事項を契約書ドラフトに反映しました。開始日・支払条件・担当窓口の3点をご確認ください」`,
        talkClose: `「契約書はメールでお送りします。開始後も引き続き私が窓口を担当いたしますので、何卒よろしくお願いいたします」`,
      };
    case "紹介依頼":
      return {
        subjectSuffix: "ご紹介のお願い",
        emailLead: `ご無沙汰しております、${source || "○○同期会"}でお世話になっている段木です。`,
        emailBody: (note) =>
          note
            ? `${note}の件で、もしお知り合いに該当しそうな方がいらっしゃいましたら、お繋ぎいただけますと幸いです。`
            : `現在お声がけしているテーマがあり、もしお知り合いにご関心がありそうな方がいれば、ご紹介いただけませんでしょうか。`,
        emailClose: `ご無理のない範囲で構いません。改めて詳細はご説明させてください。`,
        lineLead: `${name}さん、お久しぶりです、段木です。`,
        lineBody: (note) =>
          note ? `${note}の件で、もし心当たりの方いらっしゃればご紹介いただけませんか？` : `ちょっと相談で、ご紹介お願いしたい件があります。`,
        lineClose: `無理のない範囲で大丈夫です。詳細はまた改めて。`,
        talkOpening: `「${name}さん、お久しぶりです、段木です。今お時間少しよろしいですか？」`,
        talkBody: (note) =>
          note
            ? `「実は ${note} の件でご紹介をお願いしたく、もしお心当たりの方がいらっしゃればお繋ぎいただけませんか」`
            : `「ご紹介をお願いしたい件があり、お電話しました。もしお心当たりの方がいらっしゃればお繋ぎいただけませんか」`,
        talkClose: `「もちろんご無理のない範囲で大丈夫です。詳細はまた改めてお伝えします」`,
      };
    case "お礼":
      return {
        subjectSuffix: "ありがとうございました",
        emailLead: `先日はお時間をいただき、誠にありがとうございました。`,
        emailBody: (note) =>
          note
            ? `${note}について、改めて御礼申し上げます。お話しいただいた内容は今後の取り組みに必ず活かしてまいります。`
            : `お話しいただいた内容は、今後の取り組みに必ず活かしてまいります。`,
        emailClose: `また機会を見つけてお話しできればと思います。引き続きどうぞよろしくお願いいたします。`,
        lineLead: `${name}さん、先日はありがとうございました！`,
        lineBody: (note) =>
          note ? `${note}の件、本当に助かりました。` : `本当に助かりました。改めて御礼です。`,
        lineClose: `またご飯でも行きましょう。`,
        talkOpening: `「${name}さん、先日は本当にありがとうございました」`,
        talkBody: (note) =>
          note ? `「${note}の件、おかげさまで前に進められそうです」` : `「おかげさまで前に進められそうです。改めて御礼です」`,
        talkClose: `「また近いうちに改めてご挨拶させてください」`,
      };
    case "派生紹介の依頼":
      return {
        subjectSuffix: "もうお一方ご紹介のお願い",
        emailLead: `先日（先般）はお取り計らいいただき誠にありがとうございました。おかげさまで良いご縁になっております。`,
        emailBody: (note) =>
          note
            ? `重ね重ねで恐縮なのですが、${note}のような課題感をお持ちの方が ${name} 様のお知り合いにいらっしゃいましたら、もうお一方ご紹介いただくことは可能でしょうか。`
            : `重ね重ねで大変恐縮なのですが、もし ${name} 様のお知り合いに、同じくお声がけしてみたい方がいらっしゃいましたら、もうお一方お繋ぎいただけませんでしょうか。`,
        emailClose: `もちろんご無理のない範囲で構いません。これまでの取り組み内容や実績資料もお渡しできます。引き続きどうぞよろしくお願いいたします。`,
        lineLead: `${name}さん、先日はありがとうございました！おかげさまで良いご縁になっています。`,
        lineBody: (note) =>
          note
            ? `重ねてのお願いで恐縮ですが、${note}な感じの方が他にいらっしゃればもうお一方ご紹介いただけませんか？`
            : `重ねてで申し訳ないのですが、もしお知り合いに似たような方がいたらもうお一方ご紹介いただけたら嬉しいです。`,
        lineClose: `無理のない範囲で大丈夫です。これまでの実績資料も送れます。`,
        talkOpening: `「${name}さん、先日はお取り計らい本当にありがとうございました。おかげさまで良いご縁になっています」`,
        talkBody: (note) =>
          note
            ? `「重ね重ねで恐縮なのですが、${note}のような課題感をお持ちの方が ${name} さんのお知り合いにいらっしゃれば、もうお一方ご紹介いただけませんでしょうか」`
            : `「実はもうお一方、ご紹介いただきたい方をお願いしたく、お電話しました。${name} さんのお知り合いで、似たような関心をお持ちの方がいらっしゃれば、お繋ぎいただけませんか」`,
        talkClose: `「もちろんご無理のない範囲で大丈夫です。これまでの実績資料もお送りできますので、ご検討ください」`,
      };
    case "再アプローチ":
      return {
        subjectSuffix: "ご無沙汰しております",
        emailLead: `大変ご無沙汰しております、${source || "○○同期会"}でお世話になった段木です。`,
        emailBody: (note) =>
          note
            ? `${note}についてお話ししてから時間が経ちましたが、その後ご状況に変化はございませんでしょうか。`
            : `以前お話ししてから時間が経ちましたが、その後のご状況いかがでしょうか。状況に応じて改めてご提案できることがあるかと思いお声がけいたしました。`,
        emailClose: `お忙しいところ恐縮ですが、軽くお話しできる機会があれば嬉しいです。`,
        lineLead: `${name}さん、お久しぶりです、段木です。`,
        lineBody: (note) =>
          note ? `${note}の件、その後ご状況いかがですか？` : `その後どうされてるかなと思いまして。`,
        lineClose: `軽くお茶でも行けたら嬉しいです。`,
        talkOpening: `「${name}さん、大変ご無沙汰しております、段木です」`,
        talkBody: (note) =>
          note
            ? `「以前お話しした ${note} の件、その後ご状況いかがでしょうか。状況に応じて改めてご提案できる内容があり、お電話しました」`
            : `「以前お声がけしてから時間が経ったので、改めて近況伺いも兼ねてお電話しました」`,
        talkClose: `「お忙しいところ恐縮ですが、また少しお時間いただけませんか」`,
      };
    case "フォローアップ":
      return {
        subjectSuffix: "先日の件のフォローアップ",
        emailLead: `先日はお時間をいただきありがとうございました。`,
        emailBody: (note) =>
          note
            ? `${note}についての続きとして、現在の状況とご提案を整理いたしました。`
            : `先日のお話の続きとして、次のステップをご相談できればと思いご連絡いたしました。`,
        emailClose: `お手すきのタイミングでご返信いただけますと幸いです。`,
        lineLead: `${name}さん、先日はありがとうございました。`,
        lineBody: (note) =>
          note ? `${note}の件、続きで少しご相談です。` : `先日の件、続きでご相談です。`,
        lineClose: `お手すきの時にレスもらえれば大丈夫です。`,
        talkOpening: `「${name}さん、先日はありがとうございました。今お時間少しよろしいですか」`,
        talkBody: (note) =>
          note ? `「${note}の件の続きでご相談したく、お電話しました」` : `「先日の件の続きでご相談したく、お電話しました」`,
        talkClose: `「お時間あるときに、次のお打ち合わせを設定できればと思います」`,
      };
    // 初回声かけ（既存知人 or 新規の人）はデフォルト扱い
    default:
      return {
        subjectSuffix: source ? `${source}の段木` : "初めまして",
        emailLead: source
          ? `ご無沙汰しております。${source}でお会いした段木です。`
          : `初めてご連絡いたします、段木と申します。`,
        emailBody: (note) =>
          note
            ? `${note}の件でご連絡いたしました。`
            : `直近の近況伺いも兼ねまして、ご連絡いたしました。`,
        emailClose: `もしご都合よろしければ、来週あたりにお時間 30 分ほどいただけませんか。`,
        lineLead: source
          ? `${name}さん お久しぶりです、段木です。`
          : `${name}さん、初めまして、段木と申します。`,
        lineBody: (note) =>
          note ? `${note}の件で、ちょっとご連絡しました。` : `急にすみません、近況伺いです。`,
        lineClose: `来週どこかでお茶でもいかがですか？`,
        talkOpening: `「${name}さん、お久しぶりです、段木です。今ちょっとお時間よろしいですか？」`,
        talkBody: (note) =>
          note
            ? `「実は、${note}の件で少しお話しできればと思いまして」`
            : `「最近どうされてるかなと思いまして、近況伺いのお電話です」`,
        talkClose: `「次の機会、来週あたりに少しお時間いただけませんか？」`,
      };
  }
}

function getMockDraft(
  candidate: Candidate,
  scene: string,
  medium: string,
  note: string,
): string {
  const name = candidate.profile.name || "○○";
  const source = candidate.profile.source || "";
  const tpl = getSceneTemplate(scene, name, source);

  if (medium === "メール") {
    return [
      `件名: ${tpl.subjectSuffix}（段木）`,
      ``,
      `${name} 様`,
      ``,
      tpl.emailLead,
      tpl.emailBody(note),
      ``,
      tpl.emailClose,
      ``,
      `何卒よろしくお願いいたします。`,
      `段木`,
    ].join("\n");
  }
  if (medium === "LINE") {
    return [tpl.lineLead, tpl.lineBody(note), tpl.lineClose].join("\n");
  }
  // 電話用トーク台本
  return [
    `【冒頭】`,
    tpl.talkOpening,
    ``,
    `【本題】`,
    tpl.talkBody(note),
    ``,
    `【締め】`,
    tpl.talkClose,
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

  const handleCopy = async () => {
    if (!output) return;
    // navigator.clipboard.writeText は Promise を返すので、成功 / 失敗を
    // 待ってから alert を出す。古いブラウザや権限拒否時の誤フィードバックを防ぐ。
    try {
      await navigator.clipboard.writeText(output);
      alert("クリップボードにコピーしました");
    } catch {
      alert("コピーに失敗しました。手動で選択してコピーしてください");
    }
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
