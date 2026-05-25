import { describe, expect, it } from "vitest";

import { dateNDaysAgo } from "@/lib/computed/dateOffsets";

describe("dateNDaysAgo", () => {
  it("0 日前は今日 (now と同じローカル日付)", () => {
    const now = new Date(2026, 4, 25); // 2026-05-25 ローカル
    expect(dateNDaysAgo(0, now)).toBe("2026-05-25");
  });

  it("1 日前は昨日", () => {
    const now = new Date(2026, 4, 25);
    expect(dateNDaysAgo(1, now)).toBe("2026-05-24");
  });

  it("2 日前は一昨日", () => {
    const now = new Date(2026, 4, 25);
    expect(dateNDaysAgo(2, now)).toBe("2026-05-23");
  });

  it("月跨ぎを正しく扱う", () => {
    // 2026-05-01 から 2 日前 → 2026-04-29
    const now = new Date(2026, 4, 1);
    expect(dateNDaysAgo(2, now)).toBe("2026-04-29");
  });

  it("年跨ぎを正しく扱う", () => {
    // 2026-01-01 から 1 日前 → 2025-12-31
    const now = new Date(2026, 0, 1);
    expect(dateNDaysAgo(1, now)).toBe("2025-12-31");
    // 2026-01-02 から 3 日前 → 2025-12-30
    const now2 = new Date(2026, 0, 2);
    expect(dateNDaysAgo(3, now2)).toBe("2025-12-30");
  });

  it("負数は未来日 (将来用途、明日)", () => {
    const now = new Date(2026, 4, 25);
    expect(dateNDaysAgo(-1, now)).toBe("2026-05-26");
  });

  it("うるう年 2024 を正しく扱う", () => {
    // 2024-03-01 から 1 日前 → 2024-02-29 (うるう日)
    const now = new Date(2024, 2, 1);
    expect(dateNDaysAgo(1, now)).toBe("2024-02-29");
    // 2024-03-01 から 2 日前 → 2024-02-28
    expect(dateNDaysAgo(2, now)).toBe("2024-02-28");
  });
});
