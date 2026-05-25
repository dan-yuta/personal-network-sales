import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";

import { InlineTextField } from "@/components/primitives/InlineTextField";

describe("InlineTextField", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("初期表示で value が defaultValue に入っている", () => {
    render(
      <InlineTextField
        value="田中"
        onSave={() => {}}
        ariaLabel="名前"
      />,
    );
    const input = screen.getByLabelText("名前") as HTMLInputElement;
    expect(input.value).toBe("田中");
  });

  it("blur 時に値が変わっていれば onSave 発火", () => {
    const onSave = vi.fn();
    render(
      <InlineTextField value="田中" onSave={onSave} ariaLabel="名前" />,
    );
    const input = screen.getByLabelText("名前") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "田中太郎" } });
    fireEvent.blur(input);
    expect(onSave).toHaveBeenCalledWith("田中太郎");
  });

  it("blur 時に値が同じなら onSave 発火しない", () => {
    const onSave = vi.fn();
    render(
      <InlineTextField value="田中" onSave={onSave} ariaLabel="名前" />,
    );
    const input = screen.getByLabelText("名前") as HTMLInputElement;
    fireEvent.blur(input);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("dirty (未保存) 中は ● マーカーが表示される", () => {
    render(
      <InlineTextField value="田中" onSave={() => {}} ariaLabel="名前" />,
    );
    const input = screen.getByLabelText("名前") as HTMLInputElement;
    expect(screen.queryByLabelText("未保存")).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: "田中太郎" } });
    expect(screen.getByLabelText("未保存")).toBeInTheDocument();
  });

  it("Escape で値が元に戻り、onSave 発火しない", () => {
    const onSave = vi.fn();
    render(
      <InlineTextField value="田中" onSave={onSave} ariaLabel="名前" />,
    );
    const input = screen.getByLabelText("名前") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "田中太郎" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input.value).toBe("田中");
    // Escape 後の blur では (input.value === value なので) onSave 発火しない
    expect(onSave).not.toHaveBeenCalled();
  });

  it("Enter で blur が発火し、変更があれば onSave", () => {
    const onSave = vi.fn();
    render(
      <InlineTextField value="田中" onSave={onSave} ariaLabel="名前" />,
    );
    const input = screen.getByLabelText("名前") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "田中花子" } });
    fireEvent.keyDown(input, { key: "Enter" });
    // blur が発火 (jsdom では Enter→keyDown→blur チェーンは自動ではない)、
    // 代替として直接 blur を発火 (実機では (e.target).blur() が呼ばれる)
    fireEvent.blur(input);
    expect(onSave).toHaveBeenCalledWith("田中花子");
  });

  it("自動保存: 800ms 後に blur 経路で onSave 発火", () => {
    const onSave = vi.fn();
    render(
      <InlineTextField value="田中" onSave={onSave} ariaLabel="名前" />,
    );
    const input = screen.getByLabelText("名前") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "田中太郎" } });
    expect(onSave).not.toHaveBeenCalled();

    // タイマー経過させると blur 経由で onSave 発火
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(onSave).toHaveBeenCalledWith("田中太郎");
  });

  it("自動保存: 連続入力でタイマーがリセットされる (debounce)", () => {
    const onSave = vi.fn();
    render(
      <InlineTextField value="田中" onSave={onSave} ariaLabel="名前" />,
    );
    const input = screen.getByLabelText("名前") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "田中太" } });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onSave).not.toHaveBeenCalled();

    // 500ms 経過後に再入力 → タイマーリセット
    fireEvent.change(input, { target: { value: "田中太郎" } });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    // 通算 1000ms 経過しているが、2 回目入力後はまだ 500ms しか経っていない
    expect(onSave).not.toHaveBeenCalled();

    // さらに 300ms (合計 800ms 経過後) でタイマー発火
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onSave).toHaveBeenCalledWith("田中太郎");
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("自動保存: IME 変換中 (compositionstart) は抑制、確定 (compositionend) で再開", () => {
    const onSave = vi.fn();
    render(
      <InlineTextField value="田中" onSave={onSave} ariaLabel="名前" />,
    );
    const input = screen.getByLabelText("名前") as HTMLInputElement;

    // IME 開始 → composing 中は autosave 動かない
    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: "た" } });
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(onSave).not.toHaveBeenCalled();

    // 確定 → タイマー再スケジュール
    fireEvent.compositionEnd(input, { target: { value: "田" } });
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(onSave).toHaveBeenCalledWith("田");
  });

  it("外部 value 変更で draft も同期して dirty が解消", () => {
    const { rerender } = render(
      <InlineTextField value="田中" onSave={() => {}} ariaLabel="名前" />,
    );
    const input = screen.getByLabelText("名前") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "田中太郎" } });
    expect(screen.getByLabelText("未保存")).toBeInTheDocument();

    // 親が value を更新 → key={value} で remount → dirty 解消
    rerender(
      <InlineTextField value="田中太郎" onSave={() => {}} ariaLabel="名前" />,
    );
    expect(screen.queryByLabelText("未保存")).not.toBeInTheDocument();
  });
});
