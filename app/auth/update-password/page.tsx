import { UpdatePasswordForm } from "@/components/update-password-form";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  // A `token` comes from an administrator-issued reset link. Without one the
  // form asks for the current password instead, which requires a session.
  const { token } = await searchParams;

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <UpdatePasswordForm token={token} />
      </div>
    </div>
  );
}
