import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MembersJsonPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assembly_members")
    .select()
    .order("full_name", { ascending: true })
    .limit(100);

  if (error) {
    return (
      <main className="min-h-screen bg-stone-950 p-6 text-stone-50">
        <pre>{error.message}</pre>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-950 p-6 text-stone-50">
      <pre className="overflow-x-auto whitespace-pre-wrap break-words">
        {JSON.stringify(data, null, 2)}
      </pre>
    </main>
  );
}
