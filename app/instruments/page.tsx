import { getDB } from "@/lib/d1";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

async function InstrumentsData() {
  try {
    const db = await getDB();
    const { results } = await db.prepare("SELECT * FROM instruments").all();
    return <pre>{JSON.stringify(results, null, 2)}</pre>;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return <pre>{message}</pre>;
  }
}

export default function InstrumentsPage() {
  return (
    <Suspense fallback={<div>Loading instruments...</div>}>
      <InstrumentsData />
    </Suspense>
  );
}