import { AuthButton } from "@/components/auth-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";
import { Suspense } from "react";

const workflow = [
  {
    step: "1. Extract the PDF",
    detail:
      "Run the extraction script to convert the National Assembly PDF into a CSV file with 500 rows.",
  },
  {
    step: "2. Create the table",
    detail:
      "Paste the SQL from supabase/001_create_assembly_members.sql into the Supabase SQL Editor and run it once.",
  },
  {
    step: "3. Import the CSV",
    detail:
      "Upload data/import/assembly_members.csv into the assembly_members table using the Supabase dashboard.",
  },
  {
    step: "4. Verify the result",
    detail:
      "Open /members and /members/json to make sure names, provinces, and positions look correct.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(220,252,231,0.85),_transparent_38%),linear-gradient(180deg,_#faf7f0_0%,_#f0eadf_100%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col">
        <nav className="flex h-16 items-center justify-between border-b border-black/10 px-6 text-sm">
          <div className="flex items-center gap-5">
            <Link href="/" className="font-semibold">
              VN Politician Intake
            </Link>
            <Link href="/members" className="text-muted-foreground">
              Members
            </Link>
            <Link href="/members/json" className="text-muted-foreground">
              JSON
            </Link>
          </div>
          <div className="flex items-center gap-4">
            {!hasEnvVars ? (
              <EnvVarWarning />
            ) : (
              <Suspense>
                <AuthButton />
              </Suspense>
            )}
            <ThemeSwitcher />
          </div>
        </nav>

        <div className="grid flex-1 gap-8 px-6 py-10 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-[2rem] border border-black/5 bg-white/85 p-8 shadow-sm backdrop-blur">
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-800/70">
              Production Setup
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight">
              Vietnam National Assembly Term 16 database workspace
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
              The app now includes a schema, a PDF extraction script, a CSV
              template, and verification pages for the 500 elected members
              listed in the official PDF.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/members"
                className="rounded-full bg-emerald-950 px-4 py-2 text-sm font-medium text-emerald-50"
              >
                Open members QA view
              </Link>
              <Link
                href="/members/json"
                className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium"
              >
                Open raw JSON
              </Link>
            </div>

            <div className="mt-10 grid gap-4">
              {workflow.map((item) => (
                <div
                  key={item.step}
                  className="rounded-2xl border border-black/5 bg-stone-50/90 p-5"
                >
                  <h2 className="font-medium">{item.step}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <aside className="flex flex-col gap-6">
            <div className="rounded-[2rem] border border-black/5 bg-emerald-950 p-8 text-emerald-50 shadow-sm">
              <p className="text-sm uppercase tracking-[0.3em] text-emerald-200/80">
                Source PDF
              </p>
              <p className="mt-4 text-sm leading-6 text-emerald-100/90">
                <code>/Users/mtsr95/Downloads/Cong-Bo-Danh-Sach-Ch.pdf</code>
              </p>
              <p className="mt-4 text-sm leading-6 text-emerald-100/90">
                The extraction script has already generated a 500-row CSV from
                this file.
              </p>
            </div>

            <div className="rounded-[2rem] border border-black/5 bg-white/85 p-8 shadow-sm">
              <h2 className="text-lg font-semibold">Project files</h2>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                <li>
                  <code>scripts/extract_assembly_members.py</code>
                </li>
                <li>
                  <code>data/import/assembly_members.csv</code>
                </li>
                <li>
                  <code>supabase/001_create_assembly_members.sql</code>
                </li>
                <li>
                  <code>docs/assembly-members-import.md</code>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
