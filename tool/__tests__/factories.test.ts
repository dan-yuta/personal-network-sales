import { describe, expect, it, vi } from "vitest";

import {
  createMinimalProfile,
  createMinimalScorecard,
} from "@/lib/data/factories";

describe("createMinimalProfile", () => {
  it("name のみ与えると他は空文字で揃う", () => {
    const p = createMinimalProfile("田中太郎");
    expect(p.name).toBe("田中太郎");
    expect(p.furigana).toBe("");
    expect(p.birthday).toBe("");
    expect(p.source).toBe("");
    expect(p.email).toBe("");
    expect(p.phone).toBe("");
    expect(p.address).toBe("");
    expect(p.recruiter).toBe("");
    expect(p.desiredSalaryMin).toBe("");
    expect(p.desiredSalaryMax).toBe("");
    expect(p.availableStartDate).toBe("");
    expect(p.careerText).toBe("");
    expect(p.motivationFull).toBe("");
  });
});

describe("createMinimalScorecard", () => {
  it("stage に対応する label が設定される", () => {
    const sc = createMinimalScorecard("first");
    expect(sc.stage).toBe("first");
    expect(sc.label).toBe("アプローチ中");
  });

  it("decision='実施済' を立てて done 扱いになる", () => {
    const sc = createMinimalScorecard("screening");
    expect(sc.decision).toBe("実施済");
  });

  it("date は今日の YYYY-MM-DD", () => {
    // 環境依存だが、ローカル日付の形式だけ検証
    const sc = createMinimalScorecard("screening");
    expect(sc.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("initialAxis 未指定なら 4 軸すべて null", () => {
    const sc = createMinimalScorecard("screening");
    expect(sc.axisScores).toEqual({
      achievements: null,
      thinkingAbility: null,
      communication: null,
      cultureFit: null,
    });
  });

  it("initialAxis を渡すと該当軸だけ値が入る", () => {
    const sc = createMinimalScorecard("first", {
      key: "thinkingAbility",
      value: 4,
    });
    expect(sc.axisScores).toEqual({
      achievements: null,
      thinkingAbility: 4,
      communication: null,
      cultureFit: null,
    });
  });

  it("attachments は空配列、comment / summary は空文字", () => {
    const sc = createMinimalScorecard("screening");
    expect(sc.attachments).toEqual([]);
    expect(sc.comment).toBe("");
    expect(sc.summary).toBe("");
    expect(sc.format).toBe("");
    expect(sc.interviewer).toBe("");
  });

  it("各軸 (achievements/communication/cultureFit) が指定できる", () => {
    for (const key of [
      "achievements",
      "communication",
      "cultureFit",
    ] as const) {
      const sc = createMinimalScorecard("screening", { key, value: 3 });
      expect(sc.axisScores[key]).toBe(3);
      // 他の軸は null
      const others = (
        ["achievements", "thinkingAbility", "communication", "cultureFit"] as const
      ).filter((k) => k !== key);
      for (const o of others) {
        expect(sc.axisScores[o]).toBeNull();
      }
    }
  });
});
