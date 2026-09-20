import Link from "next/link";
import { redirect } from "next/navigation";
import { InfoIcon } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function ProtectedPage() {
  // proxy.ts already rejected unsigned cookies; this is the authoritative
  // check against the app_sessions table in D1.
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-12">
      <div className="w-full">
        <div className="bg-accent text-sm p-3 px-5 rounded-md text-foreground flex gap-3 items-center">
          <InfoIcon size="16" strokeWidth={2} />
          This is a protected page that you can only see as an authenticated
          user
        </div>
      </div>
      <div className="flex flex-col gap-2 items-start">
        <h2 className="font-bold text-2xl mb-4">Your account</h2>
        <pre className="text-xs font-mono p-3 rounded border max-h-32 overflow-auto">
          {JSON.stringify(user, null, 2)}
        </pre>
        <Link
          href="/auth/update-password"
          className="mt-4 text-sm underline underline-offset-4"
        >
          Change your password
        </Link>
      </div>
      <div className="flex flex-col gap-2 items-start">
        <h2 className="font-bold text-2xl mb-4">Where the data lives</h2>
        <p className="text-sm leading-6 text-muted-foreground max-w-2xl">
          Member records are stored in the Cloudflare D1 database bound to this
          Worker as <code>DB</code>. Sessions and accounts live in the same
          database, in <code>app_sessions</code> and <code>app_users</code>.
        </p>
        <Link href="/members" className="text-sm underline underline-offset-4">
          Open the members QA view
        </Link>
      </div>
    </div>
  );
}
