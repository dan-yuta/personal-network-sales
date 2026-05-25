import { describe, expect, it } from "vitest";

import {
  splitByMatches,
  tokenizeQuery,
} from "@/lib/computed/searchHighlight";

describe("splitByMatches", () => {
  it("空文字列は空配列", () => {
    expect(splitByMatches("", ["foo"])).toEqual([]);
  });

  it("空 tokens は素通り (元文字列 1 セグメント)", () => {
    expect(splitByMatches("田中太郎", [])).toEqual([
      { text: "田中太郎", match: false },
    ]);
    expect(splitByMatches("田中太郎", [""])).toEqual([
      { text: "田中太郎", match: false },
    ]);
  });

  it("マッチが無いときは元文字列 1 セグメント", () => {
    expect(splitByMatches("田中太郎", ["鈴木"])).toEqual([
      { text: "田中太郎", match: false },
    ]);
  });

  it("1 箇所マッチを分割する", () => {
    expect(splitByMatches("田中太郎", ["太郎"])).toEqual([
      { text: "田中", match: false },
      { text: "太郎", match: true },
    ]);
  });

  it("中間マッチを 3 セグメントに分割", () => {
    expect(splitByMatches("ABCDEF", ["CD"])).toEqual([
      { text: "AB", match: false },
      { text: "CD", match: true },
      { text: "EF", match: false },
    ]);
  });

  it("case-insensitive で動く", () => {
    expect(splitByMatches("Yamada Taro", ["yamada"])).toEqual([
      { text: "Yamada", match: true },
      { text: " Taro", match: false },
    ]);
  });

  it("複数 tokens を全て検出", () => {
    const segments = splitByMatches("田中 鈴木 佐藤", ["田中", "佐藤"]);
    expect(segments).toEqual([
      { text: "田中", match: true },
      { text: " 鈴木 ", match: false },
      { text: "佐藤", match: true },
    ]);
  });

  it("重複マッチをマージする (鈴木鈴木 → 1 マッチ)", () => {
    const segments = splitByMatches("鈴木鈴木", ["鈴木"]);
    expect(segments).toEqual([{ text: "鈴木鈴木", match: true }]);
  });

  it("重なる tokens (長い tokens 優先) でも正しくマージ", () => {
    // "ABCDE" に対して "BC" と "BCD" の両方検出 → "BCD" でマージされる
    const segments = splitByMatches("ABCDE", ["BC", "BCD"]);
    expect(segments).toEqual([
      { text: "A", match: false },
      { text: "BCD", match: true },
      { text: "E", match: false },
    ]);
  });

  it("マッチが文字列末尾でも正しく動く", () => {
    expect(splitByMatches("ABCDE", ["DE"])).toEqual([
      { text: "ABC", match: false },
      { text: "DE", match: true },
    ]);
  });

  it("マッチが文字列先頭でも正しく動く", () => {
    expect(splitByMatches("ABCDE", ["AB"])).toEqual([
      { text: "AB", match: true },
      { text: "CDE", match: false },
    ]);
  });
});

describe("tokenizeQuery", () => {
  it("空文字は空配列", () => {
    expect(tokenizeQuery("")).toEqual([]);
    expect(tokenizeQuery("   ")).toEqual([]);
  });

  it("単純なクエリを分割", () => {
    expect(tokenizeQuery("田中")).toEqual(["田中"]);
  });

  it("空白区切りの複数 tokens を分割", () => {
    expect(tokenizeQuery("田中 太郎")).toEqual(["田中", "太郎"]);
  });

  it("先頭末尾の余分な空白を除去", () => {
    expect(tokenizeQuery("  田中  太郎  ")).toEqual(["田中", "太郎"]);
  });

  it("連続空白も単一区切りとして扱う", () => {
    expect(tokenizeQuery("田中   太郎")).toEqual(["田中", "太郎"]);
  });

  it("タブ・全角空白は…ASCII 空白だけが区切り", () => {
    // 仕様: \s+ で分割なので、Unicode 空白は含まれる
    expect(tokenizeQuery("田中\t太郎")).toEqual(["田中", "太郎"]);
    expect(tokenizeQuery("田中\n太郎")).toEqual(["田中", "太郎"]);
  });
});
