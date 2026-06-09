import { describe, it, expect } from "vitest";
import { toCandidate } from "@/lib/notion/candidates";
import { notionCandidateSchema } from "@/lib/notion/schema";

/**
 * Notion 正規化型 → UI Candidate へのマッピング(toCandidate)の単体テスト。
 * 7段階ステージ変換・プロフィール対応・評価4軸の scorecard 合成を検証する。
 */

function makeNotion(overrides: Record<string, unknown> = {}) {
  return notionCandidateSchema.parse({
    id: "page-1",
    customerName: "山田 太郎",
    customerCompanyName: null,
    stage: "紹介進行中",
    priority: "高",
    recruiter: null,
    furigana: "ヤマダ タロウ",
    birthday: null,
    source: "○○交流会",
    email: "taro@example.com",
    contact: null,
    postalCode: null,
    address: null,
    link: null,
    backNetwork: null,
    note: "経歴メモ",
    progressDetail: "動機メモ",
    nextAction: "電話で日程調整",
    nextActionDate: "2026-06-10",
    lastContactDate: null,
    desiredSalaryMin: 80,
    desiredSalaryMax: 150,
    axisScores: {
      achievements: 3,
      thinkingAbility: null,
      communication: null,
      cultureFit: null,
    },
    archived: false,
    ...overrides,
  });
}

describe("toCandidate マッピング", () => {
  it("進捗状況(日本語7段階) を StageKey に変換する", () => {
    expect(toCandidate(makeNotion({ stage: "未連絡" })).stage).toBe("screening");
    expect(toCandidate(makeNotion({ stage: "紹介進行中" })).stage).toBe(
      "referral",
    );
    expect(toCandidate(makeNotion({ stage: "保留" })).stage).toBe("held");
  });

  it("プロフィール項目を対応づける（備考→経歴/進捗詳細→動機/接触経路→source）", () => {
    const c = toCandidate(makeNotion());
    expect(c.profile.name).toBe("山田 太郎");
    expect(c.profile.careerText).toBe("経歴メモ");
    expect(c.profile.motivationFull).toBe("動機メモ");
    expect(c.profile.source).toBe("○○交流会");
    expect(c.profile.nextActionMemo).toBe("電話で日程調整");
    expect(c.profile.availableStartDate).toBe("2026-06-10");
  });

  it("優先度(高/中/低) を key に変換する", () => {
    expect(toCandidate(makeNotion({ priority: "高" })).profile.priority).toBe(
      "high",
    );
    expect(toCandidate(makeNotion({ priority: null })).profile.priority).toBe("");
  });

  it("想定取引規模(number) を文字列にする", () => {
    const c = toCandidate(makeNotion());
    expect(c.profile.desiredSalaryMin).toBe("80");
    expect(c.profile.desiredSalaryMax).toBe("150");
  });

  it("評価4軸が1つでも入っていれば scorecard を1件合成する", () => {
    const c = toCandidate(makeNotion());
    expect(c.scorecards).toHaveLength(1);
    expect(c.scorecards[0]?.decision).toBe("現在評価");
    expect(c.scorecards[0]?.axisScores.achievements).toBe(3);
  });

  it("評価4軸が全て null なら scorecard は空にする", () => {
    const c = toCandidate(
      makeNotion({
        axisScores: {
          achievements: null,
          thinkingAbility: null,
          communication: null,
          cultureFit: null,
        },
      }),
    );
    expect(c.scorecards).toHaveLength(0);
  });

  it("archived を引き継ぐ", () => {
    expect(toCandidate(makeNotion({ archived: true })).archived).toBe(true);
  });

  it("最終連絡日を引き継ぐ（null は null）", () => {
    expect(
      toCandidate(makeNotion({ lastContactDate: "2026-06-01" })).lastContactDate,
    ).toBe("2026-06-01");
    expect(
      toCandidate(makeNotion({ lastContactDate: null })).lastContactDate,
    ).toBeNull();
  });
});
