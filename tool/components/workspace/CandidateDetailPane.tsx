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

// シーンごとに「件名」「導入文」「本題テンプレ」「締め」を切り替える。
// 営業フェーズ全体（初回〜契約）をカバーする 10 シーン用のモック。
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
