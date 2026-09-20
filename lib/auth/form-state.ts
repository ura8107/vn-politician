/**
 * Shared shape for the auth forms' useActionState.
 *
 * Kept out of lib/auth/actions.ts because a "use server" module may only
 * export async functions.
 */
export type AuthFormState = {
  error: string | null;
};

export const initialAuthFormState: AuthFormState = { error: null };
