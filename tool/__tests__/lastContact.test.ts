import { describe, expect, it } from "vitest";

import { getLastContactBadge } from "@/lib/computed/lastContact";

describe("getLastContactBadge", () => {
  // 全テストで「今日」を 2026-05-25 (ローカル) と固定する
  const TODAY = new Date(2026, 4, 25); // month は 0-indexed: 4 = May

  it("null / 空文字 / 無効日付は null を返す", () => {
    expect(getLastContactBadge(null, TODAY)).toBeNull();
    expect(getLastContactBadge("", TODAY)).toBeNull();
    expect(getLastContactBadge("not-a-date", TODAY)).toBeNull();
  });

  it("未来日は null を返す (異常データ防御)", () => {
    expect(getLastContactBadge("2026-05-26", TODAY)).toBeNull();
    expect(getLastContactBadge("2027-01-01", TODAY)).toBeNull();
  });

  it("今日 (0 日差) は『今日』fresh", () => {
    const b = getLastContactBadge("2026-05-25", TODAY);
    expect(b).not.toBeNull();
    expect(b!.text).toBe("今日");
    expect(b!.level).toBe("fresh");
    expect(b!.diffDays).toBe(0);
  });

  it("昨日 (1 日差) は『昨日』fresh", () => {
    const b = getLastContactBadge("2026-05-24", TODAY);
    expect(b!.text).toBe("昨日");
    expect(b!.level).toBe("fresh");
  });

  it("2〜13 日は『N 日前』fresh", () => {
    expect(getLastContactBadge("2026-05-23", TODAY)!.text).toBe("2日前");
    expect(getLastContactBadge("2026-05-12", TODAY)!.text).toBe("13日前");
    expect(getLastContactBadge("2026-05-12", TODAY)!.level).toBe("fresh");
  });

  it("14〜29 日は『M 週間前』aging", () => {
    // 14 日差: 2026-05-11
    const b14 = getLastContactBadge("2026-05-11", TODAY)!;
    expect(b14.text).toBe("2週間前");
    expect(b14.level).toBe("aging");
    // 29 日差: 2026-04-26
    const b29 = getLastContactBadge("2026-04-26", TODAY)!;
    expect(b29.text).toBe("4週間前");
    expect(b29.level).toBe("aging");
  });

  it("30 日〜1 年未満は『M ヶ月前』stale", () => {
    // 30 日差: 2026-04-25
    expect(getLastContactBadge("2026-04-25", TODAY)!.text).toBe("1ヶ月前");
    expect(getLastContactBadge("2026-04-25", TODAY)!.level).toBe("stale");
    // 90 日差くらい: 2026-02-24
    const b = getLastContactBadge("2026-02-24", TODAY)!;
    expect(b.text).toBe("3ヶ月前");
    expect(b.level).toBe("stale");
  });

  it("1 年以上は『M 年前』stale", () => {
    // 365 日差: 2025-05-25
    expect(getLastContactBadge("2025-05-25", TODAY)!.text).toBe("1年前");
    expect(getLastContactBadge("2025-05-25", TODAY)!.level).toBe("stale");
    // 800 日くらい (2 年強): 2024-03-17
    const b = getLastContactBadge("2024-03-17", TODAY)!;
    expect(b.text).toMatch(/^2年前$/);
    expect(b.level).toBe("stale");
  });

  it("DST 境界相当 (月末 / 年末) でも安定 (Date.UTC ベース計算)", () => {
    // 2025-12-31 → 2026-05-25 (145 日差くらい)
    const b = getLastContactBadge("2025-12-31", TODAY)!;
    expect(b.level).toBe("stale");
    // 大体 4〜5 ヶ月前
    expect(b.text).toMatch(/^(4|5)ヶ月前$/);
  });
});
