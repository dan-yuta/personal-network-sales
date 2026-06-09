/**
 * 最後に選択した候補者IDを保持する Cookie 名。
 *
 * localStorage ではなく Cookie を使う理由: Server Component (app/page.tsx) が
 * SSR 時に読み取り、初期選択として Workspace に渡せる。これにより「サーバーは
 * 既定の人で描画 → クライアントが localStorage で差し替え」という二段階で起きる
 * “一瞬別人が見える”ちらつきを構造的に防ぐ（SSR とクライアントの初期選択が一致）。
 *
 * server/client 双方から import するため、副作用のない純粋な定数モジュールに置く。
 */
export const SELECTED_CANDIDATE_COOKIE = "pns_selected";

/**
 * Pane2（候補者リスト）のスクロール位置(px)を保持する Cookie 名。
 * 再読み込み時に、初回描画より前のインラインスクリプト（app/page.tsx）が
 * この値を読んでビューポートの scrollTop を復元する。これにより「前回の
 * スクロール位置が一切ずれずに復帰する」（中央寄せ等の自動移動をしない）。
 */
export const PANE2_SCROLL_COOKIE = "pns_pane2_scroll";

/**
 * Pane2 の ScrollArea ルートに付ける id。復元スクリプト（app/page.tsx）と
 * 保存処理（CandidateListPane）の双方が、この id 配下のビューポート
 * `[data-slot="scroll-area-viewport"]` を特定するために共有する。
 */
export const PANE2_SCROLLAREA_ID = "pane2-scrollarea";
