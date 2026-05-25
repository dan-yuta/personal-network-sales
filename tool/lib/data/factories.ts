import {
  type AxisKey,
  type Profile,
  type Scorecard,
  type StageKey,
} from "@/lib/schema";
import { STAGE_LABELS } from "@/lib/labels";
import { formatISODate } from "@/lib/computed/profile";

/**
 * 候補者の最小 Profile 生成ヘルパー。
 * 氏名以外は空文字に揃え、Pane 3 では空欄として可視化される。
 * `addCandidate`（Workspace 本体）から参照される。
 */
export function createMinimalProfile(name: string): Profile {
  return {
    // プロフィール (3)
    name,
    furigana: "",
    birthday: "",
    source: "",

    // 連絡先 (3)
    email: "",
    phone: "",
    address: "",

    // 選考状況 (4)
    recruiter: "",
    desiredSalaryMin: "",
    desiredSalaryMax: "",
    availableStartDate: "",

    // 営業フォロー (3、Notion DB 由来で 2026-05-25 追加)
    nextActionMemo: "",
    priority: "",
    backNetwork: "",

    // 読み物 (2)
    careerText: "",
    motivationFull: "",
  };
}

/**
 * Pane3「現時点評価」カードでユーザーが初めて軸スコアをクリックしたとき、
 * 既存 scorecard が無ければこの最小 scorecard を新規追加する。
 *
 * - `decision = "実施済"` を立てることで `deriveStageStatus` が "done" を返し、
 *   `getLatestDoneScorecard` で取得できる (= Pane2 ScoreBadge にも反映される)
 * - 4 軸はすべて null で初期化、ユーザーがクリックした軸だけ Workspace 側で
 *   set される
 * - 日付は今日 (ローカル日付)、面接形式 / 面接官 / コメント等は空 (営業文脈で
 *   後から補完されることを想定)
 */
export function createMinimalScorecard(
  stage: StageKey,
  initialAxis?: { key: AxisKey; value: number },
): Scorecard {
  return {
    stage,
    label: STAGE_LABELS[stage],
    date: formatISODate(new Date()),
    format: "",
    interviewer: "",
    decision: "実施済",
    comment: "",
    summary: "",
    axisScores: {
      achievements:
        initialAxis?.key === "achievements" ? initialAxis.value : null,
      thinkingAbility:
        initialAxis?.key === "thinkingAbility" ? initialAxis.value : null,
      communication:
        initialAxis?.key === "communication" ? initialAxis.value : null,
      cultureFit: initialAxis?.key === "cultureFit" ? initialAxis.value : null,
    },
    attachments: [],
  };
}
