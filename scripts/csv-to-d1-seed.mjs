#!/usr/bin/env node
/**
 * Turns data/import/assembly_members.csv into a D1 seed script.
 *
 * This replaces the Supabase dashboard's "Import data from CSV" step: the
 * generated SQL is reviewable in git and applied the same way locally and in
 * production.
 *
 *   node scripts/csv-to-d1-seed.mjs
 *   node scripts/csv-to-d1-seed.mjs --input path/to.csv --output path/to.sql
 *
 * The statements use INSERT OR REPLACE with ids derived from the source PDF
 * name plus the row's page and row number, so re-running the seed updates rows
 * in place instead of duplicating them.
 */

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildSearchText, buildSortKeys } from "../lib/db/search-text.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const DEFAULT_INPUT = "data/import/assembly_members.csv";
const DEFAULT_OUTPUT = "data/seed/assembly_members.sql";

/** Columns written as SQL numbers (or NULL) rather than quoted strings. */
const NUMERIC_COLUMNS = new Set([
  "source_page",
  "source_row_number",
  "province_code",
  "electoral_unit_number",
  "birth_year",
  "term_number",
]);

/**
 * Rows are inserted in batches to keep the round trips to D1 down. D1 caps a
 * single SQL statement at 100 KB and these rows carry long Vietnamese text
 * blocks, so the batch is kept small enough to stay well under that.
 */
const BATCH_SIZE = 10;

function parseArgs(argv) {
  const args = { input: DEFAULT_INPUT, output: DEFAULT_OUTPUT };

  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];

    if (flag === "--input" || flag === "--output") {
      const value = argv[i + 1];

      if (!value) {
        throw new Error(`${flag} needs a value`);
      }

      args[flag.slice(2)] = value;
      i += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${flag}`);
  }

  return args;
}

/**
 * Minimal RFC 4180 parser. The CSV holds multi-line Vietnamese text with
 * embedded commas and escaped quotes, so splitting on commas is not an option.
 */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  // Strip the BOM so the first header name stays clean.
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (inQuotes) {
      if (char !== '"') {
        field += char;
        continue;
      }

      if (input[i + 1] === '"') {
        field += '"';
        i += 1;
        continue;
      }

      inQuotes = false;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (char === "\r") {
      continue;
    }

    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

/**
 * Deterministic UUID (v5-shaped) so regenerating the seed keeps the same ids.
 */
function deterministicId(parts) {
  const hex = createHash("sha1").update(parts.join("\u0000")).digest("hex");
  const variant = ((parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80)
    .toString(16)
    .padStart(2, "0");

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `5${hex.slice(13, 16)}`,
    `${variant}${hex.slice(18, 20)}`,
    hex.slice(20, 32),
  ].join("-");
}

function sqlString(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

function sqlValue(column, value) {
  const trimmed = value?.trim() ?? "";

  if (trimmed === "") {
    return NUMERIC_COLUMNS.has(column) ? "NULL" : column === "source_data" ? "'{}'" : "NULL";
  }

  if (NUMERIC_COLUMNS.has(column)) {
    const parsed = Number.parseInt(trimmed, 10);

    return Number.isNaN(parsed) ? "NULL" : String(parsed);
  }

  return sqlString(value);
}

function main() {
  const { input, output } = parseArgs(process.argv.slice(2));
  const inputPath = resolve(projectRoot, input);
  const outputPath = resolve(projectRoot, output);

  const [header, ...dataRows] = parseCsv(readFileSync(inputPath, "utf8"));

  if (!header) {
    throw new Error(`${input} is empty`);
  }

  const columns = [
    "id",
    ...header,
    "search_text",
    "full_name_sort",
    "province_sort",
  ];
  const values = [];

  for (const [index, cells] of dataRows.entries()) {
    // Trailing newline produces a single empty cell; skip those.
    if (cells.length === 1 && cells[0].trim() === "") {
      continue;
    }

    if (cells.length !== header.length) {
      throw new Error(
        `Row ${index + 2} has ${cells.length} columns, expected ${header.length}. ` +
          "Fix the CSV before importing.",
      );
    }

    const row = Object.fromEntries(header.map((name, i) => [name, cells[i]]));
    const id = deterministicId([
      row.source_pdf_name ?? "",
      row.source_page ?? "",
      row.source_row_number ?? String(index + 1),
    ]);

    const sortKeys = buildSortKeys(row);
    const rendered = [
      sqlString(id),
      ...header.map((name) => sqlValue(name, row[name])),
      sqlString(buildSearchText(row)),
      sqlString(sortKeys.full_name_sort),
      sqlString(sortKeys.province_sort),
    ];

    values.push(`  (${rendered.join(", ")})`);
  }

  const statements = [];

  for (let i = 0; i < values.length; i += BATCH_SIZE) {
    const batch = values.slice(i, i + BATCH_SIZE);

    statements.push(
      `INSERT OR REPLACE INTO assembly_members (${columns.join(", ")}) VALUES\n${batch.join(",\n")};`,
    );
  }

  const sql = [
    "-- Generated by scripts/csv-to-d1-seed.mjs. Do not edit by hand.",
    `-- Source: ${input}`,
    `-- Rows: ${values.length}`,
    "",
    ...statements,
    "",
  ].join("\n");

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, sql, "utf8");

  console.log(`Wrote ${values.length} rows to ${output}`);
}

main();
