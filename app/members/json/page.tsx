import { getDB } from "@/lib/d1";

export const dynamic = "force-dynamic";

export default async function MembersJsonPage() {
  try {
    const db = await getDB();
    const { results } = await db
      .prepare("SELECT * FROM assembly_members ORDER BY full_name ASC LIMIT 100")
      .all();

    return (
      <main className="min-h-screen bg-stone-950 p-6 text-stone-50">
        <pre className="overflow-x-auto whitespace-pre-wrap break-words">
          {JSON.stringify(results, null, 2)}
        </pre>
      </main>
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return (
      <main className="min-h-screen bg-stone-950 p-6 text-stone-50">
        <pre>{message}</pre>
      </main>
    );
  }
}