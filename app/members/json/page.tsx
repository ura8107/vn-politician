import { listAssemblyMemberRecords } from "@/lib/db/assembly-members";

export const dynamic = "force-dynamic";

export default async function MembersJsonPage() {
  let records;

  try {
    records = await listAssemblyMemberRecords();
  } catch (error) {
    return (
      <main className="min-h-screen bg-stone-950 p-6 text-stone-50">
        <pre>{error instanceof Error ? error.message : "Unknown D1 error"}</pre>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-950 p-6 text-stone-50">
      <pre className="overflow-x-auto whitespace-pre-wrap break-words">
        {JSON.stringify(records, null, 2)}
      </pre>
    </main>
  );
}
