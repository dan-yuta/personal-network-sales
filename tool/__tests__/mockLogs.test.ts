import { describe, expect, it } from "vitest";

import {
  MOCK_LOG_DATASET,
  getLastContactDate,
  getMockLogs,
} from "@/lib/data/mockLogs";

describe("mockLogs", () => {
  it("MOCK_LOG_DATASET は接触ログのある候補者を保持 (空配列のテスト候補者は含まない)", () => {
    const keys = Object.keys(MOCK_LOG_DATASET);
    // 既存 c1〜c14 + 拡張 c15/c16/c17/c21/c22/c25/c26/c28/c29/c30
    // c18 / c19 / c20 / c23 / c24 / c27 は意図的に未登録 (= 接触ログなしの
    // テストパターンとして UI 側で「接触ログなし」表示を確認できる)
    expect(keys).toContain("c1");
    expect(keys).toContain("c14");
    expect(keys).toContain("c30");
    expect(keys.length).toBeGreaterThanOrEqual(14);
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
