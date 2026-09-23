import { getDB } from "@/lib/d1";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export const dynamic = "force-dynamic";

const FEATURES = [
  {
    title: "Search the database",
    description:
      "Find any of the 500 elected deputies by name, province, electoral unit, or occupation. Sort and filter to narrow the list.",
    href: "/members",
    label: "Browse members",
  },
  {
    title: "View full profiles",
    description:
      "Each deputy has a dedicated page with their province, electoral unit, biography fields, education, and occupation from the official list.",
    href: "/members",
    label: "Open a profile",
  },
  {
    title: "Access raw data",
    description:
      "The complete dataset is available as JSON for developers, researchers, and journalists working with the official records.",
    href: "/members/json",
    label: "View JSON",
  },
];

async function getStats() {
  const fallback = { total: 500, provinces: 34, sources: 1 };
  try {
    const db = await getDB();
    const row = await db
      .prepare(
        "SELECT COUNT(*) AS total, COUNT(DISTINCT province_name) AS provinces FROM assembly_members",
      )
      .first<{ total: number; provinces: number }>();
    if (!row || !row.total) return fallback;
    return {
      total: row.total,
      provinces: row.provinces,
      sources: 1,
    };
  } catch {
    return fallback;
  }
}

export default async function Home() {
  const stats = await getStats();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(220,252,231,0.85),_transparent_38%),linear-gradient(180deg,_#faf7f0_0%,_#f0eadf_100%)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 py-14">
        <section className="grid gap-10 lg:grid-cols-[1.25fr_0.75fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-800/70">
              Vietnam · Quốc hội khóa XVI
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-5xl">
              The elected members of the 16th National Assembly of Vietnam
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
              An independent, searchable database of the 500 deputies elected on
              the 15th of March 2026, compiled from the official list published
              by the National Election Council. Browse by name, province, or
              electoral unit.
            </p>

            <form
              action="/members"
              method="get"
              className="mt-8 grid max-w-xl gap-3 sm:grid-cols-[1fr_auto]"
            >
              <Input
                name="q"
                placeholder="Search a name, province, or position…"
                className="h-12 rounded-2xl border-black/10 bg-white text-sm"
              />
              <button
                type="submit"
                className="h-12 rounded-2xl bg-emerald-950 px-6 text-sm font-medium text-emerald-50 transition-colors hover:bg-emerald-900"
              >
                Search
              </button>
            </form>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/members"
                className="rounded-full border border-black/10 bg-white/80 px-4 py-2 text-sm font-medium"
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

          <aside className="rounded-[2rem] border border-black/5 bg-emerald-950 p-8 text-emerald-50 shadow-sm">
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-200/80">
              Database
            </p>
            <dl className="mt-6 grid gap-6">
              {[
                { label: "Elected deputies", value: stats.total },
                { label: "Provinces & cities", value: stats.provinces },
                { label: "Official source", value: stats.sources },
              ].map((item) => (
                <div key={item.label} className="border-b border-emerald-800/60 pb-4 last:border-0 last:pb-0">
                  <dt className="text-sm text-emerald-200/70">{item.label}</dt>
                  <dd className="mt-1 text-4xl font-semibold">{item.value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 text-xs leading-5 text-emerald-200/70">
              Tenure 2026–2031 · election held 15 March 2026
            </p>
          </aside>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          {FEATURES.map((feature) => (
            <Link
              key={feature.title}
              href={feature.href}
              className="group rounded-3xl border border-black/5 bg-white/85 p-7 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <h2 className="text-lg font-semibold">{feature.title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {feature.description}
              </p>
              <span className="mt-5 inline-block text-sm font-medium text-emerald-900 group-hover:underline">
                {feature.label} →
              </span>
            </Link>
          ))}
        </section>

        <section className="rounded-[2rem] border border-black/5 bg-white/85 p-8 shadow-sm">
          <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-emerald-800/70">
                About the data
              </p>
              <h2 className="mt-3 text-2xl font-semibold">A trusted, official source</h2>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                This database is built from the official list of people elected
                as deputies of the 16th National Assembly of Vietnam, published
                by the National Election Council (Hội đồng bầu cử quốc gia)
                under Resolution No. 232/NQ-HĐBCQG on 21 March 2026.
              </p>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                A PDF copy of the official list is archived with this project
                for provenance, and every record records the source page and
                row in the original document.
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <Link
                href="/members"
                className="rounded-2xl border border-black/10 bg-stone-50 p-5 text-sm font-medium transition hover:border-emerald-800 hover:bg-emerald-50"
              >
                Browse 500 deputies →
              </Link>
              <Link
                href="/members/json"
                className="rounded-2xl border border-black/10 bg-stone-50 p-5 text-sm font-medium transition hover:border-emerald-800 hover:bg-emerald-50"
              >
                Download raw data (JSON) →
              </Link>
              <div className="rounded-2xl border border-black/10 bg-stone-50 p-5 text-sm leading-6 text-muted-foreground">
                <span className="font-medium text-foreground">Disclaimer: </span>
                This is an independent informational site and is not affiliated
                with the National Assembly of Vietnam or any government body.
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}