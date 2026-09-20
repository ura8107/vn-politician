-- D1 schema for vn-politician.
-- Apply with:
--   wrangler d1 execute vn-politician-db --file d1/schema.sql --remote
--   wrangler d1 execute vn-politician-db --file d1/seed.sql  --remote

drop table if exists assembly_members;

create table if not exists assembly_members (
  id text primary key,
  source_pdf_name text,
  source_page integer,
  source_row_number integer,
  province_code integer,
  province_name text,
  electoral_unit_number integer,
  electoral_unit_description text,
  full_name text not null,
  full_name_ascii text,
  birth_date_text text,
  birth_year integer,
  gender text,
  nationality text,
  ethnicity text,
  religion text,
  home_town text,
  residence text,
  general_education text,
  professional_qualification text,
  political_theory text,
  foreign_language text,
  occupation_position text,
  workplace text,
  party_joined_on text,
  national_assembly_history text,
  peoples_council_history text,
  notes text,
  raw_text text,
  source_data text not null default '{}',
  term_number integer not null default 16,
  term_label text not null default 'Vietnam National Assembly Term 16',
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create index if not exists idx_assembly_members_full_name
  on assembly_members (full_name);

create index if not exists idx_assembly_members_full_name_ascii
  on assembly_members (full_name_ascii);

create index if not exists idx_assembly_members_province_name
  on assembly_members (province_name);

create index if not exists idx_assembly_members_electoral_unit_number
  on assembly_members (electoral_unit_number);

-- Placeholder for future instrument records. No data is loaded yet.
create table if not exists instruments (
  id text primary key,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);