/**
 * 接触ログのモックデータと派生ヘルパー。
 *
 * Phase 1 (Notion API 未接続) は接触ログをこの dataset から読み出す。
 * Pane4「接触ログ」タブだけでなく、Pane2/Pane3 に「最終接触からの経過日数」を
 * 出すためにも参照する必要が生じたため、CandidateDetailPane の中に閉じていた
 * MOCK_LOG_DATASET をモジュールとしてここに切り出した。
 *
 * Phase 3 で Notion 接続後は `getLastContactDate` だけ「接触ログ DB の
 * createdTime 降順 1 件」に差し替えれば、UI 側はそのまま動く想定。
 */

export type MockLogEntry = {
  id: string;
  date: string;
  method: string;
  content: string;
};

/**
 * 候補者ごとに異なるモックログ。Pane3 編集中に頻繁に再レンダされるため、
 * dataset は const としてモジュールトップレベルに置き、render 中の object 再生成
 * (100 件超の object literal の GC 圧) を回避する。
 *
 * 各候補者の logs は「新→旧」の降順を維持する (Pane4 接触ログ表示と一致)。
 */
export const MOCK_LOG_DATASET: Record<string, MockLogEntry[]> = {
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
      content:
        "役員会で導入検討と返答。次回は現場責任者の佐藤さん同席で訪問予定",
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
  c6: [
    {
      id: "log-c6-1",
      date: "2026-05-20",
      method: "LINE",
      content:
        "交流会後にお礼+次のMTG打診。当日中に返信あり、5/26で即決",
    },
    {
      id: "log-c6-2",
      date: "2026-05-20",
      method: "訪問",
      content:
        "ビジネス交流会(渋谷)で名刺交換。シリーズBで営業組織を急拡大中とのこと",
    },
  ],
  c7: [
    {
      id: "log-c7-1",
      date: "2026-05-15",
      method: "訪問",
      content:
        "初回面談 90分(神田事務所)。具体的な活用シーン5つをヒアリング、顧問先60社への横展開ポテンシャルあり",
    },
    {
      id: "log-c7-2",
      date: "2026-05-08",
      method: "メール",
      content:
        "山田さんから紹介メール経由で初接触。事務所案内・サービス資料を送付",
    },
  ],
  c8: [
    {
      id: "log-c8-1",
      date: "2026-05-12",
      method: "訪問",
      content:
        "工場見学(名古屋)2時間。現場の DX 取組みを実物で確認、社員のリアクションも良好",
    },
    {
      id: "log-c8-2",
      date: "2026-04-28",
      method: "訪問",
      content:
        "製造業オーナー会で初接触。事業承継準備でIT見直し開始という背景を聞き取り",
    },
  ],
  c9: [
    {
      id: "log-c9-1",
      date: "2026-05-22",
      method: "電話",
      content:
        "契約合意。月額12万プランで決定、運用開始は 6/20。山田さんへ別途お礼連絡",
    },
    {
      id: "log-c9-2",
      date: "2026-05-15",
      method: "オンライン会議",
      content:
        "デモ実施 60分。理事長+総務部長同席。入学相談業務の効率化シーンで好感触",
    },
    {
      id: "log-c9-3",
      date: "2026-05-05",
      method: "メール",
      content:
        "山田さんからの紹介メールで初接触。学校概要・現状の課題感を共有いただく",
    },
  ],
  c10: [
    {
      id: "log-c10-1",
      date: "2026-05-18",
      method: "訪問",
      content:
        "△△交流会(目黒)で初接触。2号店出店検討中、店舗運営の見える化に関心ありとのこと",
    },
  ],
  c11: [
    {
      id: "log-c11-1",
      date: "2026-05-10",
      method: "電話",
      content:
        "失注連絡を受領。競合製品が機能数で勝ったとのこと。半年後の上位プラン更新タイミングで再提案合意",
    },
    {
      id: "log-c11-2",
      date: "2026-05-02",
      method: "オンライン会議",
      content:
        "最終比較プレゼン 60分。価格・機能・サポート体制で競合と並列評価された",
    },
    {
      id: "log-c11-3",
      date: "2026-04-15",
      method: "メール",
      content:
        "前職時代の名刺リスト経由でアポ獲得。初回提案を実施、好感触",
    },
  ],
  c12: [
    {
      id: "log-c12-1",
      date: "2026-05-08",
      method: "電話",
      content:
        "失注連絡。年間予算編成済みで今期は組み込めず。来期(2027年1月以降)で再検討合意",
    },
    {
      id: "log-c12-2",
      date: "2026-04-20",
      method: "訪問",
      content:
        "事務所訪問 60分。社員5名規模での導入イメージをすり合わせ",
    },
  ],
  c13: [
    {
      id: "log-c13-1",
      date: "2026-05-14",
      method: "電話",
      content:
        "親会社の中期計画策定が8月まで続くため、それまで具体的な動きは取れないと連絡。月1回の情報交換は継続合意",
    },
    {
      id: "log-c13-2",
      date: "2026-04-25",
      method: "訪問",
      content:
        "現場視察を兼ねた工事現場見学 2時間。現場の DX 課題感を共有",
    },
    {
      id: "log-c13-3",
      date: "2026-04-08",
      method: "メール",
      content:
        "山田さんからの紹介メール経由で初接触。会社概要・提案資料を送付",
    },
  ],
  c14: [
    {
      id: "log-c14-1",
      date: "2026-05-11",
      method: "オンライン会議",
      content:
        "楽天モール出店準備で半年はリソースが取れないと連絡。年末以降の再検討合意、月1回の近況報告レベルで継続",
    },
    {
      id: "log-c14-2",
      date: "2026-04-30",
      method: "オンライン会議",
      content:
        "Webセミナー後の個別商談 45分。EC運営の課題感を深掘り",
    },
  ],
  // c15 〜 c30 (2026-05-25 拡張)。空配列なし候補者 (= 接触ログなしのテストパターン)
  // も意図的に含める: c18 / c19 / c20 / c23 / c24 / c27 / c28 など。
  c15: [
    {
      id: "log-c15-1",
      date: "2026-05-22",
      method: "メール",
      content:
        "国際カンファレンス後の名刺交換フォロー (英語)。事業概要・サンプル機能紹介を送付",
    },
  ],
  c16: [
    {
      id: "log-c16-1",
      date: "2026-05-18",
      method: "SNS",
      content:
        "セミナー登壇後の LinkedIn メッセージ。資料追加リクエストに回答",
    },
  ],
  c17: [
    {
      id: "log-c17-1",
      date: "2026-05-20",
      method: "オンライン会議",
      content:
        "ロンドン本社との時差調整 60 分。日本ローカライズの強みを訴求、好感触",
    },
    {
      id: "log-c17-2",
      date: "2026-05-12",
      method: "訪問",
      content:
        "代官山オフィス訪問。グローバル ツール方針と整合させたい意向ヒアリング",
    },
  ],
  c21: [
    {
      id: "log-c21-1",
      date: "2026-05-08",
      method: "オンライン会議",
      content:
        "本国予算 Q3 承認待ち (8 月予定) と連絡。月 1 で近況交換継続合意",
    },
  ],
  c22: [
    {
      id: "log-c22-1",
      date: "2026-05-20",
      method: "電話",
      content:
        "契約合意。月額18万プランで決定。山田さんへ別途お礼連絡、4件目契約",
    },
    {
      id: "log-c22-2",
      date: "2026-05-08",
      method: "訪問",
      content:
        "薬局3店舗の現地視察 (浦安・新浦安・市川)。ChatGPT 活用事例を見せてもらう",
    },
  ],
  c25: [
    {
      id: "log-c25-1",
      date: "2026-05-20",
      method: "メール",
      content:
        "工場見学アポイント (6/15) 確定。事前資料として会社案内 + 提案概要送付",
    },
    {
      id: "log-c25-2",
      date: "2026-05-15",
      method: "訪問",
      content:
        "勉強会後の懇親会 2 時間。父親 (会長) との関係性、決裁フローをヒアリング",
    },
  ],
  c26: [
    {
      id: "log-c26-1",
      date: "2026-05-21",
      method: "LINE",
      content:
        "オンライン MTG 候補日(5/26) 確定。本社韓国側担当者の同席リクエスト",
    },
    {
      id: "log-c26-2",
      date: "2026-05-18",
      method: "訪問",
      content:
        "新大久保のコミュニティ会合で意気投合。日韓両国スタッフのコミュニケーション課題を共有",
    },
  ],
  c28: [
    {
      id: "log-c28-1",
      date: "2026-05-09",
      method: "電話",
      content:
        "失注連絡。他社 SaaS と既契約のため。1 年後の予算策定タイミングで再提案合意",
    },
  ],
  c29: [
    {
      id: "log-c29-1",
      date: "2026-05-12",
      method: "オンライン会議",
      content:
        "シドニーとの時差調整 60 分。国内 1 号店オープン (9月) まで保留、再開時に即動ける関係性を維持",
    },
  ],
  c30: [
    {
      id: "log-c30-1",
      date: "2026-05-21",
      method: "訪問",
      content:
        "番町オフィス初回訪問 90 分。業界内 5 社への横展開ポテンシャル確認",
    },
    {
      id: "log-c30-2",
      date: "2026-05-15",
      method: "メール",
      content:
        "山田さんからの紹介メール経由で初接触。会社概要・サービス資料送付",
    },
  ],
};

/**
 * 共有空配列 (参照安定化用)。未登録 ID の logs アクセスでも常に同じ参照を返し、
 * useMemo / React.memo の deps が無駄に変わらないようにする。
 */
const EMPTY_LOGS: MockLogEntry[] = [];

/**
 * 候補者 ID から接触ログ配列を取得する。未登録 ID は空配列 (共有参照)。
 * 配列は「新→旧」の降順。Pane4 の履歴表示は配列順そのまま使える。
 */
export function getMockLogs(candidateId: string): MockLogEntry[] {
  return MOCK_LOG_DATASET[candidateId] ?? EMPTY_LOGS;
}

/**
 * 候補者の「最終接触日」を返す。接触ログが 1 件もなければ null。
 *
 * dataset は新→旧の降順なので先頭が最終接触。万一 dataset が降順でない
 * (将来のソート崩壊への保険) ケースでも最大日付を返せるよう、念のため
 * 全件走査して最新を取る。
 *
 * 戻り値は YYYY-MM-DD 文字列 (ローカル日付として解釈)。
 */
export function getLastContactDate(candidateId: string): string | null {
  const logs = getMockLogs(candidateId);
  if (logs.length === 0) return null;
  let latest = logs[0].date;
  for (let i = 1; i < logs.length; i++) {
    if (logs[i].date > latest) latest = logs[i].date;
  }
  return latest || null;
}
