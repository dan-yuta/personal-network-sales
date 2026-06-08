// @ts-nocheck
/**
 * デモ用 Notion 候補者DB へのシードスクリプト（冪等・再実行可）。
 *
 * 役割:
 *   - 公開デモDB（営業候補リスト_AI school用）の既存行を全クリア
 *   - data/candidates.json の約30人ダミーを投入
 *   - 発表/スクショ直前に再実行してクリーン状態に戻せる
 *
 * 使い方:
 *   1. tool/.env.local に NOTION_TOKEN と NOTION_DB_CANDIDATES(=デモのデータソースID) を設定
 *   2. cd tool && node scripts/seed-notion.mjs
 *
 * 安全ガード: 本番候補者DB(b36fdbb0…)を指していたら中断する。
 */
import { readFileSync } from "node:fs";
import { Client } from "@notionhq/client";

// ---- .env.local を手動ロード（standalone node は自動読込しない） ----
function loadEnvLocal() {
  try {
    const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // .env.local が無ければ既存の process.env を使う
  }
}
loadEnvLocal();

const TOKEN = process.env.NOTION_TOKEN;
const DS = process.env.NOTION_DB_CANDIDATES;
const REAL_DB_GUARD = "b36fdbb0-2266-4ce0-8327-00c10468bbb4"; // 本番候補者DB

if (!TOKEN || !DS) {
  console.error(
    "NOTION_TOKEN と NOTION_DB_CANDIDATES を .env.local に設定してください。",
  );
  process.exit(1);
}
if (DS.replace(/-/g, "").startsWith(REAL_DB_GUARD.replace(/-/g, ""))) {
  console.error(
    "本番候補者DB を指しています。シード（全クリア）は実行できません。デモのデータソースIDを設定してください。",
  );
  process.exit(1);
}

const notion = new Client({ auth: TOKEN });

const STAGE_MAP = {
  screening: "未連絡",
  first: "アプローチ中",
  referral: "紹介進行中",
  second: "商談中",
  final: "契約",
  lost: "失注",
  held: "保留",
};
const PRIORITY_MAP = { high: "高", medium: "中", low: "低" };

const rt = (v) => (v ? { rich_text: [{ text: { content: String(v) } }] } : { rich_text: [] });
const title = (v) => ({ title: [{ text: { content: String(v ?? "") } }] });
const dateP = (v) => (v ? { date: { start: v } } : { date: null });
const num = (v) => {
  const n = v === "" || v == null ? null : Number(v);
  return { number: Number.isFinite(n) ? n : null };
};
const sel = (name) => (name ? { select: { name } } : { select: null });

async function clearAll() {
  let cursor;
  let cleared = 0;
  do {
    const res = await notion.dataSources.query({
      data_source_id: DS,
      start_cursor: cursor,
      page_size: 100,
    });
    for (const row of res.results) {
      await notion.pages.update({ page_id: row.id, archived: true });
      cleared++;
    }
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return cleared;
}

async function insertCandidate(c) {
  const p = c.profile ?? {};
  const axis = (c.scorecards ?? []).at(-1)?.axisScores ?? {};
  await notion.pages.create({
    parent: { type: "data_source_id", data_source_id: DS },
    properties: {
      顧客名: title(p.name),
      フリガナ: rt(p.furigana),
      生年月日: dateP(p.birthday),
      接触経路: rt(p.source),
      Email: { email: p.email || null },
      連絡先: rt(p.phone),
      住所: rt(p.address),
      想定取引規模Min: num(p.desiredSalaryMin),
      想定取引規模Max: num(p.desiredSalaryMax),
      次回アクション期限: dateP(p.availableStartDate),
      次回アクション: rt(p.nextActionMemo),
      優先度: sel(PRIORITY_MAP[p.priority] ?? null),
      バック人脈: rt(p.backNetwork),
      備考: rt(p.careerText),
      進捗詳細: rt(p.motivationFull),
      進捗状況: sel(STAGE_MAP[c.stage] ?? "未連絡"),
      アーカイブ: { checkbox: !!c.archived },
      関係性の強さ: num(axis.achievements),
      興味度合い: num(axis.thinkingAbility),
      レスポンス速度: num(axis.communication),
      紹介ポテンシャル: num(axis.cultureFit),
    },
  });
}

async function main() {
  const candidates = JSON.parse(
    readFileSync(new URL("../data/candidates.json", import.meta.url), "utf8"),
  );
  console.log(`対象データソース: ${DS}`);
  console.log("既存行をクリア中…");
  const cleared = await clearAll();
  console.log(`  ${cleared} 件クリア`);
  console.log(`${candidates.length} 件のダミー候補者を投入中…`);
  let i = 0;
  for (const c of candidates) {
    await insertCandidate(c);
    i++;
    if (i % 10 === 0) console.log(`  ${i}/${candidates.length}`);
  }
  console.log(`完了: ${i} 件投入。`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
