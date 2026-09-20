import { signOutAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  // A plain form post: the session row is deleted from D1 inside the action,
  // so signing out revokes the session server-side rather than only in cookies.
  return (
    <form action={signOutAction}>
      <Button type="submit">Logout</Button>
    </form>
  );
}
