/**
 * Shared normalisation for the `assembly_members.search_text` column.
 *
 * Written as .mjs (not .ts) so the Node seed generator
 * (scripts/csv-to-d1-seed.mjs) and the Worker query layer
 * (lib/db/assembly-members.ts) run the exact same code. If the two ever drift,
 * stored haystacks and user input stop matching and search silently breaks.
 *
 * Postgres compared with ILIKE, which folds case for Vietnamese too. SQLite's
 * LIKE and lower() only fold ASCII, so the folding happens here instead:
 * decompose to NFD, drop the combining marks, map đ/Đ (which has no combining
 * form) to d, lowercase, and collapse whitespace.
 *
 * @param {string | null | undefined} value
 * @returns {string}
 */
export function foldSearchText(value) {
  if (!value) {
    return "";
  }

  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Builds the haystack stored in `search_text` for one row.
 *
 * @param {Record<string, string | null | undefined>} row
 * @returns {string}
 */
export function buildSearchText(row) {
  return [
    row.full_name,
    row.full_name_ascii,
    row.province_name,
    row.occupation_position,
    row.workplace,
  ]
    .map(foldSearchText)
    .filter(Boolean)
    .join(" ");
}

/**
 * Sort keys for the columns Postgres used to order with a linguistic
 * collation. See the comment on full_name_sort in
 * migrations/0001_assembly_members.sql.
 *
 * @param {Record<string, string | null | undefined>} row
 * @returns {{ full_name_sort: string, province_sort: string }}
 */
export function buildSortKeys(row) {
  return {
    full_name_sort: foldSearchText(row.full_name),
    province_sort: foldSearchText(row.province_name),
  };
}
