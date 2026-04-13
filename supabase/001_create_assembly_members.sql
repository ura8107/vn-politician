create extension if not exists pgcrypto;

create table if not exists public.assembly_members (
  id uuid primary key default gen_random_uuid(),
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
  source_data jsonb not null default '{}'::jsonb,
  term_number smallint not null default 16,
  term_label text not null default 'Vietnam National Assembly Term 16',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists assembly_members_full_name_idx
  on public.assembly_members (full_name);

create index if not exists assembly_members_full_name_ascii_idx
  on public.assembly_members (full_name_ascii);

create index if not exists assembly_members_province_name_idx
  on public.assembly_members (province_name);

create index if not exists assembly_members_electoral_unit_number_idx
  on public.assembly_members (electoral_unit_number);

alter table public.assembly_members enable row level security;

drop policy if exists "Allow public read access to assembly members"
  on public.assembly_members;

create policy "Allow public read access to assembly members"
on public.assembly_members
for select
using (true);
