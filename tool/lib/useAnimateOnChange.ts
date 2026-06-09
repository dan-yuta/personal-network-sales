import { useEffect, useRef } from "react";

/**
 * 「値が変わった再レンダー時だけ true」を返すフック。
 *
 * 入場アニメ（tw-animate-css の `animate-in fade-in` 等）を `key` 付き要素に
 * 付けると、ユーザー操作での切替だけでなく **初回マウント（＝ページ再読み込み）でも
 * 発火**してしまい、リロードのたびに中身がフェードインして「一瞬ちらつく」。
 *
 * このフックは初回レンダー（SSR とハイドレーション直後）では false を返すため、
 * 初回はアニメを付けず即時表示できる。値が変化した後続レンダーでのみ true を返し、
 * 「ユーザーが切り替えた時だけフェード」を実現する。SSR とクライアントの初回が
 * ともに false なのでハイドレーション不一致も起きない。
 *
 * 注意: `value` に undefined を渡すと初回判定が崩れるため、string/number など
 * 非 undefined の識別子を渡すこと（本アプリでは selectedCandidateId / activeTab）。
 */
export function useAnimateOnChange<T>(value: T): boolean {
  const prev = useRef<T | undefined>(undefined);
  const changed = prev.current !== undefined && prev.current !== value;
  useEffect(() => {
    prev.current = value;
  }, [value]);
  return changed;
}
