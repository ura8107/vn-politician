import { getDB } from "@/lib/d1";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type MemberProfile = Record<string, string | number | null>;

const PROFILE_FIELDS: Array<[string, keyof MemberProfile]> = [
  ["Full name (Vietnamese)", "full_name"],
  ["Name without diacritics", "full_name_ascii"],
  ["Province / city", "province_name"],
  ["Electoral unit", "electoral_unit_number"],
  ["Date of birth", "birth_date_text"],
  ["Gender", "gender"],
  ["Nationality", "nationality"],
  ["Ethnicity", "ethnicity"],
  ["Religion", "religion"],
  ["Home town", "home_town"],
  ["Residence", "residence"],
  ["General education", "general_education"],
  ["Professional qualification", "professional_qualification"],
  ["Political theory", "political_theory"],
  ["Foreign language", "foreign_language"],
  ["Occupation & position", "occupation_position"],
  ["Workplace", "workplace"],
  ["Party joined on", "party_joined_on"],
  ["National Assembly history", "national_assembly_history"],
  ["People's Council history", "peoples_council_history"],
  ["Notes", "notes"],
  ["Source page", "source_page"],
  ["Source row", "source_row_number"],
];

async function getMember(id: string) {
  try {
    const db = await getDB();
    const member = await db
      .prepare(
        "SELECT * FROM assembly_members WHERE id = ?1 LIMIT 1",
      )
      .bind(id)
      .first<MemberProfile>();
    return member ?? null;
  } catch {
    return null;
  }
}

export default async function MemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const member = await getMember(id);

  if (!member) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(220,252,231,0.7),_transparent_40%),linear-gradient(180deg,_#fbf8ef_0%,_#f5efe4_100%)]">
      <div className="mx-auto w-full max-w-4xl px-6 py-12">
        <Link
          href="/members"
          className="text-sm font-medium text-emerald-900 hover:underline"
        >
          ← Back to members
        </Link>

        <div className="mt-6 rounded-[2rem] border border-black/5 bg-emerald-950 p-8 text-emerald-50 shadow-sm">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-200/80">
            Deputy · Term 16 {member.term_label ? `· ${member.term_label}` : ""}
          </p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight">
            {member.full_name}
          </h1>
          <p className="mt-3 text-sm leading-6 text-emerald-100/90">
            {[member.province_name, member.occupation_position]
              .filter(Boolean)
              .join(" · ") ||
              "Elected to the 16th National Assembly of Vietnam"}
          </p>
        </div>

        <div className="mt-8 overflow-hidden rounded-[2rem] border border-black/5 bg-white/85 shadow-sm">
          <dl className="divide-y divide-black/5">
            {PROFILE_FIELDS.map(([label, key]) => {
              const value = member[key];
              const display =
                value === null || value === undefined || value === ""
                  ? "—"
                  : String(value);
              return (
                <div
                  key={key}
                  className="grid gap-1 px-6 py-4 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)] sm:gap-6"
                >
                  <dt className="text-sm font-medium text-stone-500">
                    {label}
                  </dt>
                  <dd className="text-sm leading-6">{display}</dd>
                </div>
              );
            })}
          </dl>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/members"
            className="rounded-full bg-emerald-950 px-4 py-2 text-sm font-medium text-emerald-50 hover:bg-emerald-900"
          >
            Browse all members
          </Link>
          <Link
            href="/members/json"
            className="rounded-full border border-black/10 bg-white/80 px-4 py-2 text-sm font-medium"
          >
            Raw data (JSON)
          </Link>
        </div>
      </div>
    </main>
  );
}