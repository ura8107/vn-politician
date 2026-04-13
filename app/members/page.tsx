import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

type AssemblyMember = {
  id: string;
  full_name: string;
  full_name_ascii: string | null;
  occupation_position: string | null;
  province_name: string | null;
  electoral_unit_number: number | null;
  workplace: string | null;
  nationality: string | null;
};

async function getAssemblyMembers() {
  const supabase = await createClient();

  const { data, error, count } = await supabase
    .from("assembly_members")
    .select(
      "id, full_name, full_name_ascii, occupation_position, province_name, electoral_unit_number, workplace, nationality",
      { count: "exact" },
    )
    .order("full_name", { ascending: true })
    .limit(100);

  return { data: data as AssemblyMember[] | null, error, count };
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-foreground/20 bg-background/70 p-8">
      <h2 className="text-2xl font-semibold">No members imported yet</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
        The database table is ready, but it looks empty. Follow the import guide
        to create the table in Supabase and upload the CSV extracted from the
        PDF.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/members/json"
          className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          Open JSON view
        </Link>
        <a
          href="https://app.supabase.com"
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-foreground/20 px-4 py-2 text-sm font-medium"
        >
          Open Supabase Dashboard
        </a>
      </div>
    </div>
  );
}

export default async function MembersPage() {
  const { data, error, count } = await getAssemblyMembers();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(205,252,239,0.8),_transparent_45%),linear-gradient(180deg,_#fbf8ef_0%,_#f5efe4_100%)] text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-6 py-12">
        <header className="grid gap-5 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="rounded-[2rem] border border-black/5 bg-white/85 p-8 shadow-sm backdrop-blur">
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-800/70">
              Vietnam Data Intake
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight">
              National Assembly member intake workspace
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
              This page is the first validation layer after importing the PDF
              into Supabase. It reads the first 100 rows from{" "}
              <code>assembly_members</code> so you can quickly spot broken
              names, wrong provinces, and missing positions.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/members/json"
                className="rounded-full bg-emerald-900 px-4 py-2 text-sm font-medium text-emerald-50"
              >
                Raw JSON
              </Link>
              <Link
                href="/"
                className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium"
              >
                Home
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-black/5 bg-emerald-950 p-8 text-emerald-50 shadow-sm">
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-200/80">
              Status
            </p>
            <dl className="mt-5 grid gap-4">
              <div>
                <dt className="text-sm text-emerald-200/70">Rows in table</dt>
                <dd className="mt-1 text-4xl font-semibold">{count ?? 0}</dd>
              </div>
              <div>
                <dt className="text-sm text-emerald-200/70">Source</dt>
                <dd className="mt-1 text-sm leading-6">
                  Supabase `public.assembly_members`
                </dd>
              </div>
              <div>
                <dt className="text-sm text-emerald-200/70">Next check</dt>
                <dd className="mt-1 text-sm leading-6">
                  Confirm 500 rows after the CSV import is complete.
                </dd>
              </div>
            </dl>
          </div>
        </header>

        {error ? (
          <pre className="overflow-x-auto rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            {error.message}
          </pre>
        ) : !data || data.length === 0 ? (
          <EmptyState />
        ) : (
          <section className="overflow-hidden rounded-[2rem] border border-black/5 bg-white/85 shadow-sm backdrop-blur">
            <div className="border-b border-black/5 px-6 py-4">
              <h2 className="text-lg font-semibold">First 100 members</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                A compact QA view for the imported records.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-stone-100/80 text-stone-600">
                  <tr>
                    <th className="px-6 py-3 font-medium">Name</th>
                    <th className="px-6 py-3 font-medium">ASCII</th>
                    <th className="px-6 py-3 font-medium">Province</th>
                    <th className="px-6 py-3 font-medium">Electoral unit</th>
                    <th className="px-6 py-3 font-medium">Position</th>
                    <th className="px-6 py-3 font-medium">Workplace</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((member) => (
                    <tr key={member.id} className="border-t border-black/5">
                      <td className="px-6 py-4 font-medium">{member.full_name}</td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {member.full_name_ascii || "-"}
                      </td>
                      <td className="px-6 py-4">{member.province_name || "-"}</td>
                      <td className="px-6 py-4">
                        {member.electoral_unit_number || "-"}
                      </td>
                      <td className="px-6 py-4">{member.occupation_position || "-"}</td>
                      <td className="px-6 py-4">
                        {member.workplace || member.nationality || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
