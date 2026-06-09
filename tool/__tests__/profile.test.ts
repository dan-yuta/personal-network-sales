import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";

import {
  calculateAge,
  formatISODate,
  parseISODate,
  todayPartsJST,
} from "@/lib/computed/profile";

describe("todayPartsJST", () => {
  it("UTC の夜は JST では翌日になる（SSR=UTC とクライアント=JST のズレを吸収）", () => {
    // 2026-06-09 20:00 UTC = 2026-06-10 05:00 JST → JST 暦日は 6/10
    expect(todayPartsJST(new Date("2026-06-09T20:00:00Z"))).toEqual({
      year: 2026,
      month: 6,
      day: 10,
    });
  });

  it("UTC の昼は JST も同日", () => {
    // 2026-06-10 01:00 UTC = 2026-06-10 10:00 JST → 6/10
    expect(todayPartsJST(new Date("2026-06-10T01:00:00Z"))).toEqual({
      year: 2026,
      month: 6,
      day: 10,
    });
  });

  it("年跨ぎ: 大晦日の UTC 夜は JST では元日", () => {
    // 2025-12-31 20:00 UTC = 2026-01-01 05:00 JST
    expect(todayPartsJST(new Date("2025-12-31T20:00:00Z"))).toEqual({
      year: 2026,
      month: 1,
      day: 1,
    });
  });
});

describe("parseISODate", () => {
  it("空文字は undefined", () => {
    expect(parseISODate("")).toBeUndefined();
  });

  it("不正フォーマットは undefined", () => {
    expect(parseISODate("not-a-date")).toBeUndefined();
  });

  it("ローカル 0 時で返す（タイムゾーン跨ぎを避ける）", () => {
    const d = parseISODate("2000-01-15");
    expect(d).toBeDefined();
    expect(d?.getFullYear()).toBe(2000);
    expect(d?.getMonth()).toBe(0);
    expect(d?.getDate()).toBe(15);
    expect(d?.getHours()).toBe(0);
  });
});

describe("formatISODate", () => {
  it("undefined は空文字", () => {
    expect(formatISODate(undefined)).toBe("");
  });

  it("不正な Date は空文字", () => {
    expect(formatISODate(new Date("invalid"))).toBe("");
  });

  it("YYYY-MM-DD にゼロ埋めで整形", () => {
    expect(formatISODate(new Date(2024, 0, 5))).toBe("2024-01-05");
    expect(formatISODate(new Date(2024, 11, 31))).toBe("2024-12-31");
  });
});

describe("calculateAge", () => {
  beforeAll(() => {
    // テスト時点を 2026-05-09（日本時間）に固定する。
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 9));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it("空文字は空文字", () => {
    expect(calculateAge("")).toBe("");
  });

  it("不正フォーマットは空文字", () => {
    expect(calculateAge("hello")).toBe("");
  });

  it("誕生日を過ぎていれば加齢済みの年齢", () => {
    expect(calculateAge("2000-01-15")).toBe("26 歳");
  });

  it("誕生日前（同年内）は1引いた年齢", () => {
    expect(calculateAge("2000-12-31")).toBe("25 歳");
  });

  it("当日（誕生日ぴったり）は加齢済み", () => {
    expect(calculateAge("2000-05-09")).toBe("26 歳");
  });

  it("未来の生年月日は空文字（負の年齢を弾く）", () => {
    expect(calculateAge("2099-01-01")).toBe("");
  });
});
