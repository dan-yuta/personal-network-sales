import "server-only";
import type { PageObjectResponse } from "@notionhq/client";

/**
 * Notion ページのプロパティ値を type による discriminated union から安全に取り出す
 * 共通ヘルパー。candidates.ts / contact-logs.ts で共有する。
 *
 * 対象プロパティが存在しない DB（本番DBにデモ列が無い等）でも null/false/[] を
 * 返すので、本番DB・デモDB どちらでも同じ parser が動く。
 */

export type Props = PageObjectResponse["properties"];

export function plainText(props: Props, name: string): string | null {
  const p = props[name];
  if (!p) return null;
  if (p.type === "rich_text") {
    return p.rich_text.map((t) => t.plain_text).join("") || null;
  }
  if (p.type === "title") {
    return p.title.map((t) => t.plain_text).join("") || null;
  }
  return null;
}

export function selectName(props: Props, name: string): string | null {
  const p = props[name];
  if (!p) return null;
  if (p.type === "select") return p.select?.name ?? null;
  if (p.type === "status") return p.status?.name ?? null;
  return null;
}

export function dateStart(props: Props, name: string): string | null {
  const p = props[name];
  if (p?.type === "date") return p.date?.start ?? null;
  return null;
}

export function numberVal(props: Props, name: string): number | null {
  const p = props[name];
  if (p?.type === "number") return p.number ?? null;
  return null;
}

export function checkboxVal(props: Props, name: string): boolean {
  const p = props[name];
  return p?.type === "checkbox" ? p.checkbox : false;
}

export function emailVal(props: Props, name: string): string | null {
  const p = props[name];
  if (p?.type === "email") return p.email ?? null;
  return null;
}

export function urlVal(props: Props, name: string): string | null {
  const p = props[name];
  if (p?.type === "url") return p.url ?? null;
  return null;
}

export function personName(props: Props, name: string): string | null {
  const p = props[name];
  if (p?.type === "people") {
    const first = p.people[0];
    if (first && "name" in first) return first.name ?? null;
  }
  return null;
}

/** relation プロパティの関連ページ ID 一覧。 */
export function relationIds(props: Props, name: string): string[] {
  const p = props[name];
  if (p?.type === "relation") return p.relation.map((r) => r.id);
  return [];
}
