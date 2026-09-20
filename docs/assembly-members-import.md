# Vietnam National Assembly Term 16 Import Guide

This repository runs a PDF-to-D1 workflow. The source PDF is the official
publication `Cong-Bo-Danh-Sach-Ch.pdf`.

The workflow is:

1. Extract the table from the PDF into CSV.
2. Review the CSV for row breaks or missing values.
3. Apply the D1 migrations to create the `assembly_members` table.
4. Generate a SQL seed from the CSV and run it against D1.
5. Confirm the imported records at `/members` and `/members/json`.

The PDF extraction step still runs locally with Python; only the loading half
of the pipeline changed when the project moved to Cloudflare.

## 1. Extract the CSV from the PDF

Run this command inside the project:

```bash
python3 scripts/extract_assembly_members.py \
  --input /path/to/Cong-Bo-Danh-Sach-Ch.pdf \
  --output data/import/assembly_members.csv
```

What this does:

- Reads the PDF with `pdftotext -bbox-layout`.
- Uses PDF word coordinates instead of plain line breaks.
- Rebuilds one deputy per CSV row.
- Stores province and electoral unit information with every row.
- Adds `full_name_ascii` for easier search later.

## 2. Review the generated CSV

Open the CSV and check:

- The file has 500 rows of data.
- One deputy appears on one row only.
- `full_name` is still in Vietnamese.
- `province_name` and `electoral_unit_number` look reasonable.
- Long text fields such as `occupation_position` and `workplace` are not shifted into the wrong columns.

If a field is still messy, keep the raw text in the CSV and fix the row before import.

## 3. Create the table in D1

```bash
npm run db:migrate:local    # local database
npm run db:migrate:remote   # production database
```

What [migrations/0001_assembly_members.sql](../migrations/0001_assembly_members.sql) does:

- Creates `assembly_members`.
- Adds columns matching the PDF structure.
- Keeps `source_data` as JSON text so no source field has to be thrown away.
- Adds `search_text`, `full_name_sort`, and `province_sort`, which are the
  diacritic-folded columns that make search and ordering behave the way the
  Postgres collation used to.

D1 records which migrations it has applied, so re-running is safe.

## 4. Generate and load the seed

```bash
npm run db:generate-seed   # CSV -> data/seed/assembly_members.sql
npm run db:seed:local      # load into the local D1
npm run db:seed:remote     # load into the production D1
```

`scripts/csv-to-d1-seed.mjs` handles what the Supabase CSV importer used to:

- numeric columns (`birth_year`, `province_code`, `electoral_unit_number`,
  `source_page`, `source_row_number`) are written as numbers, blanks as NULL
- `source_data` keeps its JSON string
- `term_number` stays `16`
- ids are derived from the PDF name plus page and row number, so the statements
  are `INSERT OR REPLACE` and re-running updates rows instead of duplicating them

The generator fails loudly if a CSV row does not have the expected column
count, so a broken row is caught before it reaches the database.

## 5. Verify with wrangler

```bash
npx wrangler d1 execute vn-politician --remote \
  --command "select count(*) from assembly_members"
```

You should expect:

```text
500
```

Then inspect a small sample:

```bash
npx wrangler d1 execute vn-politician --remote --command "
select full_name, province_name, electoral_unit_number, occupation_position
from assembly_members
order by province_code, electoral_unit_number, source_row_number
limit 20"
```

## 6. Verify in the app

Start the app:

```bash
npm run dev
```

Then open:

- `/members` for the readable QA table
- `/members/json` for the raw JSON output

Search is accent-insensitive: both `Hà Nội` and `ha noi` return the same rows.

## 7. Why the table keeps `source_data`

The PDF has complex cells and long text blocks.
To keep the import safe, the schema stores the main searchable fields in normal columns and reserves `source_data` for anything extra or uncertain.
That means you can import first, inspect the data, and refine later without losing the source information.

## 8. Re-importing after a CSV fix

Fix the CSV, then run `npm run db:generate-seed` followed by the seed command
for the target database. Because the ids are deterministic, corrected rows
overwrite the old ones and the row count stays at 500.
