import { getDB } from "@/lib/d1";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Raw data (JSON)",
};

export default async function MembersJsonPage() {
  try {
    const db = await getDB();
    const { results } = await db
      .prepare("SELECT * FROM assembly_members ORDER BY full_name ASC")
      .all();

    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto w-full max-w-6xl px-6 py-12">
          <h1 className="text-3xl font-semibold">Raw data (JSON)</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            The full dataset of {results.length} deputies, one object per
            deputy, with the biographical fields from the official list
            published under Resolution No. 232/NQ-HĐBCQG. Machine-readable and
            free to use.
          </p>
          <pre className="mt-8 overflow-x-auto rounded-[2rem] border border-black/10 bg-stone-950 p-6 text-sm leading-6 text-stone-50">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      </main>
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto w-full max-w-6xl px-6 py-12">
          <h1 className="text-3xl font-semibold">Raw data (JSON)</h1>
          <pre className="mt-8 overflow-x-auto rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            {message}
          </pre>
        </div>
      </main>
    );
  }
}