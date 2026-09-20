import { getDb } from "@/lib/cf/env";
import { foldSearchText } from "./search-text.mjs";

/**
 * Query layer for `assembly_members`.
 *
 * Supabase enforced read access with a Row Level Security policy. D1 has no
 * equivalent and is only reachable through the Worker binding, so this module
 * is the access boundary: it selects an explicit column list and never accepts
 * caller-supplied SQL.
 */

/**
 * Maps a sort option to the column actually used in ORDER BY. The name and
 * province options sort on their folded keys because SQLite only offers
 * BINARY collation; see migrations/0001_assembly_members.sql.
 */
export const SORT_COLUMNS = {
  full_name: "full_name_sort",
  province_name: "province_sort",
  electoral_unit_number: "electoral_unit_number",
} as const;

export const SORT_DIRECTIONS = {
  asc: "asc",
  desc: "desc",
} as const;

export type SortKey = keyof typeof SORT_COLUMNS;
export type SortDirection = keyof typeof SORT_DIRECTIONS;

export type AssemblyMemberSummary = {
  id: string;
  full_name: string;
  full_name_ascii: string | null;
  occupation_position: string | null;
  province_name: string | null;
  electoral_unit_number: number | null;
  workplace: string | null;
  nationality: string | null;
};

export type AssemblyMemberQuery = {
  query: string;
  province: string;
  sort: SortKey;
  direction: SortDirection;
  limit?: number;
};

export type AssemblyMemberPage = {
  rows: AssemblyMemberSummary[];
  /** Total matches, which can exceed `rows.length` because of the limit. */
  total: number;
};

const SUMMARY_COLUMNS = [
  "id",
  "full_name",
  "full_name_ascii",
  "occupation_position",
  "province_name",
  "electoral_unit_number",
  "workplace",
  "nationality",
].join(", ");

export const DEFAULT_PAGE_SIZE = 100;

export function isSortKey(value: string): value is SortKey {
  return value in SORT_COLUMNS;
}

export function isSortDirection(value: string): value is SortDirection {
  return value in SORT_DIRECTIONS;
}

/** Escapes the LIKE wildcards so a search for "100%" is not a match-anything. */
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

function buildFilters(state: Pick<AssemblyMemberQuery, "query" | "province">) {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (state.province) {
    conditions.push("province_name = ?");
    params.push(state.province);
  }

  // The stored haystack is already folded, so the needle is folded the same
  // way. See lib/db/search-text.mjs.
  const needle = foldSearchText(state.query);

  if (needle) {
    conditions.push("search_text LIKE ? ESCAPE '\\'");
    params.push(`%${escapeLikePattern(needle)}%`);
  }

  return {
    where: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
  };
}

export async function listAssemblyMembers(
  state: AssemblyMemberQuery,
): Promise<AssemblyMemberPage> {
  const db = getDb();
  const limit = state.limit ?? DEFAULT_PAGE_SIZE;
  const { where, params } = buildFilters(state);

  // Both identifiers come from the SORT_* maps above, never from user input.
  const orderBy = `ORDER BY ${SORT_COLUMNS[state.sort]} ${SORT_DIRECTIONS[state.direction]} NULLS LAST`;

  const [rowsResult, countResult] = await db.batch<
    AssemblyMemberSummary | { total: number }
  >([
    db
      .prepare(
        `SELECT ${SUMMARY_COLUMNS} FROM assembly_members ${where} ${orderBy} LIMIT ?`,
      )
      .bind(...params, limit),
    db
      .prepare(`SELECT count(*) AS total FROM assembly_members ${where}`)
      .bind(...params),
  ]);

  return {
    rows: rowsResult.results as AssemblyMemberSummary[],
    total: (countResult.results as { total: number }[])[0]?.total ?? 0,
  };
}

export async function listProvinces(): Promise<string[]> {
  const { results } = await getDb()
    .prepare(
      `SELECT DISTINCT province_name, province_sort
       FROM assembly_members
       WHERE province_name IS NOT NULL AND province_name <> ''
       ORDER BY province_sort ASC`,
    )
    .all<{ province_name: string }>();

  return results.map((row) => row.province_name);
}

export type AssemblyMemberRecord = Record<string, unknown> & {
  id: string;
  full_name: string;
};

/**
 * Full rows for the JSON inspection view. `source_data` is stored as text in
 * SQLite (it was jsonb in Postgres), so it is parsed back into an object to
 * keep the rendered JSON shaped the way it was under Supabase.
 */
export async function listAssemblyMemberRecords(
  limit = DEFAULT_PAGE_SIZE,
): Promise<AssemblyMemberRecord[]> {
  const { results } = await getDb()
    .prepare(
      `SELECT * FROM assembly_members ORDER BY full_name_sort ASC NULLS LAST LIMIT ?`,
    )
    .bind(limit)
    .all<AssemblyMemberRecord>();

  return results.map((row) => ({
    ...row,
    source_data: parseSourceData(row.source_data),
  }));
}

function parseSourceData(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    // Keep the raw text rather than dropping data the PDF extraction produced.
    return value;
  }
}
