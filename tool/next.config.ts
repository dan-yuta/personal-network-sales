import type { NextConfig } from "next";
import path from "node:path";

// プロジェクトルートを明示する（Turbopack の dev 用）。
// 親ディレクトリに lockfile が紛れていると Next.js がそこをワークスペース
// ルートと誤認する事故を防ぐ目的。現状この repo の親階層に lockfile は無い。
//
// 注意: ここで `outputFileTracingRoot` は **設定しない**。
//   Vercel のデプロイアダプタ（Next 16.2 Adapters API の onBuildComplete）は
//   ビルド成果物のマニフェスト（routes-manifest 等）を既定ルート基準で探す。
//   `outputFileTracingRoot` をサブディレクトリに固定すると探索パスがずれ、
//   `onBuildComplete from Vercel` 段階で routes-manifest-deterministic.json の
//   ENOENT を起こしデプロイが失敗する（ローカルはアダプタ非実行のため再現せず）。
const projectRoot = path.resolve(__dirname);

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  // 左下に出る Next.js Dev Tools Indicator (Route/Bundler/Preferences の "N" ボタン)
  // を非表示にする。デフォルトでは npm run dev 時に常時表示され、
  // 開発者向けデバッグ用パネル (英語のみ・日本語化不可) なので、
  // 提出スクショや動作確認時の視認性を上げるため無効化。
  // 本番ビルド (next build) では元から表示されない。
  devIndicators: false,
};

export default nextConfig;
