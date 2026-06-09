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
