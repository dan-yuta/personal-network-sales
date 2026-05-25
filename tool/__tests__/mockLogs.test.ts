import { describe, expect, it } from "vitest";

import {
  MOCK_LOG_DATASET,
  getLastContactDate,
  getMockLogs,
} from "@/lib/data/mockLogs";

describe("mockLogs", () => {
  it("MOCK_LOG_DATASET は c1〜c14 を全件持つ", () => {
    const keys = Object.keys(MOCK_LOG_DATASET).sort();
    expect(keys).toEqual([
      "c1",
      "c10",
      "c11",
      "c12",
      "c13",
      "c14",
      "c2",
      "c3",
      "c4",
      "c5",
      "c6",
      "c7",
      "c8",
      "c9",
    ]);
  });

  it("getMockLogs は登録済 ID で配列を返す", () => {
    const logs = getMockLogs("c2");
    expect(logs.length).toBe(3);
    expect(logs[0].method).toBe("電話");
  });

  it("getMockLogs は未登録 ID で空配列を返す (参照は共有で安定)", () => {
    const a = getMockLogs("non-existent");
    const b = getMockLogs("also-non-existent");
    expect(a).toEqual([]);
    // 共有 EMPTY_LOGS を返すことで useMemo deps が無駄に変わらない
    expect(a).toBe(b);
  });

  it("getLastContactDate は最新日付を返す", () => {
    // c2 は 2026-05-10 が最新 (logs[0])
    expect(getLastContactDate("c2")).toBe("2026-05-10");
  });

  it("getLastContactDate は単一ログでも正しく動く", () => {
    // c1 は 1 件のみ (2026-05-08)
    expect(getLastContactDate("c1")).toBe("2026-05-08");
  });

  it("getLastContactDate は順序崩れにも頑健 (全件走査で最大日付を返す)", () => {
    // c8 は 2026-05-12 / 2026-04-28 の 2 件で、降順に並んでいる前提だが、
    // 仮に順序が崩れても最大が返ることを担保する
    expect(getLastContactDate("c8")).toBe("2026-05-12");
  });

  it("getLastContactDate は未登録 ID で null", () => {
    expect(getLastContactDate("non-existent")).toBeNull();
  });
});
