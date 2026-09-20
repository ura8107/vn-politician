import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "Forgot password",
};

/**
 * Self-service password reset is gone: it relied on Supabase sending an email,
 * and Cloudflare Email Routing only receives mail. An administrator issues a
 * one-time link instead. See docs/requirements-cloudflare.md section 6.
 */
export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Reset your password</CardTitle>
            <CardDescription>
              Password reset is handled by an administrator.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
            <p>
              This site runs entirely on Cloudflare, which has no outbound email
              service, so no reset email can be sent automatically.
            </p>
            <p>
              Ask an administrator to run{" "}
              <code className="rounded bg-muted px-1 py-0.5">
                npm run auth:reset-link -- --email you@example.com
              </code>{" "}
              and send you the generated link. It works once and expires after
              one hour.
            </p>
            <Link
              href="/auth/login"
              className="underline underline-offset-4"
            >
              Back to login
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
