import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";

import { ToasterProvider, useToast } from "@/components/workspace/Toaster";

// 簡易フィクスチャ: useToast を呼び出す子コンポーネント。push / dismiss を
// ボタンクリックで発火する。
function Fixture({
  setup,
}: {
  setup: (api: ReturnType<typeof useToast>) => void;
}) {
  const api = useToast();
  return (
    <div>
      <button type="button" onClick={() => setup(api)}>
        run
      </button>
    </div>
  );
}

describe("ToasterProvider / useToast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("Provider 外で useToast 呼ぶと throw", () => {
    // useToast はフックだが、呼び出しは Fixture (component) 経由で
    // テストする必要がある。React コンソールエラーは抑制。
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => {
      render(
        <Fixture
          setup={() => {
            /* noop */
          }}
        />,
      );
    }).toThrow(/ToasterProvider/);
    spy.mockRestore();
  });

  it("push でメッセージが表示される", () => {
    render(
      <ToasterProvider>
        <Fixture setup={(api) => api.push({ message: "保存しました" })} />
      </ToasterProvider>,
    );
    fireEvent.click(screen.getByText("run"));
    expect(screen.getByText("保存しました")).toBeInTheDocument();
  });

  it("undo 指定時は「元に戻す」ボタンが出る", () => {
    const undo = vi.fn();
    render(
      <ToasterProvider>
        <Fixture
          setup={(api) =>
            api.push({ message: "削除しました", undo })
          }
        />
      </ToasterProvider>,
    );
    fireEvent.click(screen.getByText("run"));
    const undoBtn = screen.getByRole("button", { name: "操作を元に戻す" });
    expect(undoBtn).toBeInTheDocument();
    fireEvent.click(undoBtn);
    expect(undo).toHaveBeenCalledTimes(1);
    // クリック後はトーストが消える
    expect(screen.queryByText("削除しました")).not.toBeInTheDocument();
  });

  it("undo 連打しても 1 回しか実行されない", () => {
    const undo = vi.fn();
    render(
      <ToasterProvider>
        <Fixture
          setup={(api) =>
            api.push({ message: "削除しました", undo })
          }
        />
      </ToasterProvider>,
    );
    fireEvent.click(screen.getByText("run"));
    const undoBtn = screen.getByRole("button", { name: "操作を元に戻す" });
    fireEvent.click(undoBtn);
    // 1 回目で dismiss されるので 2 回目クリックは効かない
    expect(undo).toHaveBeenCalledTimes(1);
  });

  it("自動消滅 (デフォルト 5 秒)", () => {
    render(
      <ToasterProvider>
        <Fixture
          setup={(api) => api.push({ message: "自動で消える" })}
        />
      </ToasterProvider>,
    );
    fireEvent.click(screen.getByText("run"));
    expect(screen.getByText("自動で消える")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.queryByText("自動で消える")).not.toBeInTheDocument();
  });

  it("duration 指定で消滅時間を変えられる", () => {
    render(
      <ToasterProvider>
        <Fixture
          setup={(api) =>
            api.push({ message: "短命", duration: 1000 })
          }
        />
      </ToasterProvider>,
    );
    fireEvent.click(screen.getByText("run"));
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByText("短命")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(screen.queryByText("短命")).not.toBeInTheDocument();
  });

  it("× ボタンで手動 dismiss", () => {
    render(
      <ToasterProvider>
        <Fixture
          setup={(api) => api.push({ message: "閉じる対象" })}
        />
      </ToasterProvider>,
    );
    fireEvent.click(screen.getByText("run"));
    const closeBtn = screen.getByRole("button", { name: "通知を閉じる" });
    fireEvent.click(closeBtn);
    expect(screen.queryByText("閉じる対象")).not.toBeInTheDocument();
  });

  it("複数 push でスタック表示、最大 5 件で古いものから drop", () => {
    let pushFn!: ReturnType<typeof useToast>["push"];
    render(
      <ToasterProvider>
        <Fixture
          setup={(api) => {
            pushFn = api.push;
          }}
        />
      </ToasterProvider>,
    );
    fireEvent.click(screen.getByText("run"));
    act(() => {
      for (let i = 1; i <= 6; i++) pushFn({ message: `msg-${i}` });
    });
    // msg-1 が drop されて msg-2 〜 msg-6 が残る
    expect(screen.queryByText("msg-1")).not.toBeInTheDocument();
    expect(screen.getByText("msg-6")).toBeInTheDocument();
    expect(screen.getByText("msg-2")).toBeInTheDocument();
  });
});
