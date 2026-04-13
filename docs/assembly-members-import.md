# Vietnam National Assembly Term 16 Import Guide

This repository is now prepared for a PDF-to-Supabase workflow.
The source PDF you shared is:

- `/Users/mtsr95/Downloads/Cong-Bo-Danh-Sach-Ch.pdf`

The workflow is:

1. Extract the table from the PDF into CSV.
2. Review the CSV for row breaks or missing values.
3. Create the `assembly_members` table in Supabase.
4. Import the CSV in the Supabase dashboard.
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

## 3. Create the table in Supabase

Open Supabase Dashboard, then go to `SQL Editor`.
Create a new query and paste the contents of [supabase/001_create_assembly_members.sql](/Users/mtsr95/vn-politician/supabase/001_create_assembly_members.sql:1).
Run it once.

What the SQL does:

- Creates `public.assembly_members`.
- Adds columns matching the PDF structure.
- Adds `source_data` JSON so no source field has to be thrown away.
- Enables Row Level Security.
- Adds a read policy for the app.

## 4. Import the CSV in Supabase

In Supabase Dashboard:

1. Open `Table Editor`.
2. Select `assembly_members`.
3. Click `Import data from CSV`.
4. Upload `data/import/assembly_members.csv`.
5. Confirm the column mapping.
6. Start the import.

Before you click import, check these carefully:

- `birth_year`, `province_code`, `electoral_unit_number`, `source_page`, and `source_row_number` map to numeric columns.
- `source_data` contains valid JSON strings.
- `term_number` is `16`.

## 5. Verify in SQL Editor

Run:

```sql
select count(*) from public.assembly_members;
```

You should expect:

```text
500
```

Then inspect a small sample:

```sql
select
  full_name,
  province_name,
  electoral_unit_number,
  occupation_position
from public.assembly_members
order by province_code, electoral_unit_number, source_row_number
limit 20;
```

## 6. Verify in the app

Start the app:

```bash
npm run dev
```

Then open:

- `/members` for the readable QA table
- `/members/json` for the raw JSON output

## 7. Why the table keeps `source_data`

The PDF has complex cells and long text blocks.
To keep the first import safe for a beginner, the schema stores the main searchable fields in normal columns and reserves `source_data` for anything extra or uncertain.
That means you can import first, inspect the data, and refine later without losing the source information.
