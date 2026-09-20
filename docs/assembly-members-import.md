# Vietnam National Assembly Term 16 Import Guide

This repository is prepared for a PDF-to-Cloudflare-D1 workflow.
The source PDF you shared is:

- `/Users/mtsr95/Downloads/Cong-Bo-Danh-Sach-Ch.pdf`

The workflow is:

1. Extract the table from the PDF into CSV.
2. Review the CSV for row breaks or missing values.
3. Apply the D1 schema (creates `assembly_members`).
4. Generate and load `d1/seed.sql` from the CSV.
5. Confirm the imported records at `/members` and `/members/json`.

## 1. Extract the CSV from the PDF

Run this command inside the project:

```bash
python3 scripts/extract_assembly_members.py \
  --input /Users/mtsr95/Downloads/Cong-Bo-Danh-Sach-Ch.pdf \
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

## 3. Apply the D1 schema

The table definition lives in `d1/schema.sql`. Apply it with Wrangler:

```bash
# local (dev) database
npx wrangler d1 execute vn-politician-db --file d1/schema.sql --local

# remote (production) database
npx wrangler d1 execute vn-politician-db --file d1/schema.sql --remote
```

What the SQL does:

- Creates the `assembly_members` table with columns matching the PDF structure.
- Adds `source_data` JSON so no source field has to be thrown away.
- Creates indexes used by the search / sort / filter queries on `/members`.
- Creates an empty `instruments` placeholder table.

## 4. Generate the seed SQL from the CSV

The repo keeps `d1/seed.sql` generated, but you can rebuild it any time:

```bash
python3 scripts/build_d1_seed.py
```

This reads `data/import/assembly_members.csv` and writes exactly one SQL file
of batched `INSERT` statements, assigning each row a generated UUID.

## 5. Load the seed data into D1

```bash
# local
npx wrangler d1 execute vn-politician-db --file d1/seed.sql --local

# remote
npx wrangler d1 execute vn-politician-db --file d1/seed.sql --remote
```

## 6. Verify the row count

Run:

```bash
npx wrangler d1 execute vn-politician-db --command "SELECT COUNT(*) FROM assembly_members;" --remote
```

You should expect `500`.

Then inspect a small sample:

```sql
select
  full_name,
  province_name,
  electoral_unit_number,
  occupation_position
from assembly_members
order by province_code, electoral_unit_number, source_row_number
limit 20;
```

## 7. Verify in the app

Start the app:

```bash
npm run dev
```

Then open:

- `/members` for the readable QA table
- `/members/json` for the raw JSON output

To test in the Workers runtime instead:

```bash
npm run preview
```

## 8. Why the table keeps `source_data`

The PDF has complex cells and long text blocks.
To keep the first import safe for a beginner, the schema stores the main searchable fields in normal columns and reserves `source_data` for anything extra or uncertain.
That means you can import first, inspect the data, and refine later without losing the source information.