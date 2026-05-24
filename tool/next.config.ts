import type { NextConfig } from "next";
import path from "node:path";

// プロジェクトルートを明示する。次の事故を防ぐ目的:
//   1. 親ディレクトリ（ホーム直下など）に lockfile が紛れていると Next.js が
//      そこをワークスペースルートと誤認識し、`outputFileTracing` が想定外の範囲を辿る
//   2. モノレポに将来取り込まれた場合でも本ディレクトリが基準になる
const projectRoot = path.resolve(__dirname);

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  outputFileTracingRoot: projectRoot,
  // 左下に出る Next.js Dev Tools Indicator (Route/Bundler/Preferences の "N" ボタン)
  // を非表示にする。デフォルトでは npm run dev 時に常時表示され、
  // 開発者向けデバッグ用パネル (英語のみ・日本語化不可) なので、
  // 提出スクショや動作確認時の視認性を上げるため無効化。
  // 本番ビルド (next build) では元から表示されない。
  devIndicators: false,
};

export default nextConfig;
