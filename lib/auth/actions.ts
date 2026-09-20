"use server";

import { redirect } from "next/navigation";

import { isSignUpOpen } from "@/lib/cf/env";
import type { AuthFormState } from "./form-state";
import { MIN_PASSWORD_LENGTH, verifyPassword } from "./password";
import {
  createSession,
  deleteExpiredSessions,
  destroyAllSessionsForUser,
  destroyCurrentSession,
  getCurrentUser,
} from "./session";
import {
  createUser,
  findPasswordReset,
  findUserByEmail,
  findUserById,
  markPasswordResetUsed,
  normalizeEmail,
  updateUserPassword,
} from "./users";

/**
 * Server Actions replacing the browser-side Supabase Auth calls that used to
 * live in components/*-form.tsx. Credentials never reach the client bundle now.
 */

function field(formData: FormData, name: string): string {
  const value = formData.get(name);

  return typeof value === "string" ? value : "";
}

function validatePassword(password: string, repeat?: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }

  if (repeat !== undefined && password !== repeat) {
    return "Passwords do not match";
  }

  return null;
}

export async function signInAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = field(formData, "email");
  const password = field(formData, "password");

  if (!email || !password) {
    return { error: "Enter your email and password" };
  }

  const user = await findUserByEmail(email);

  // Same message either way: do not reveal whether the address is registered.
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return { error: "Invalid email or password" };
  }

  await deleteExpiredSessions();
  await createSession(user.id);

  redirect("/protected");
}

export async function signUpAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!isSignUpOpen()) {
    return {
      error: "Sign-up is closed. Ask an administrator to create your account.",
    };
  }

  const email = normalizeEmail(field(formData, "email"));
  const password = field(formData, "password");
  const repeatPassword = field(formData, "repeat-password");

  if (!email.includes("@")) {
    return { error: "Enter a valid email address" };
  }

  const passwordError = validatePassword(password, repeatPassword);

  if (passwordError) {
    return { error: passwordError };
  }

  if (await findUserByEmail(email)) {
    return { error: "An account with this email already exists" };
  }

  const user = await createUser(email, password);

  // Supabase sent a confirmation email here. Cloudflare has no outbound email
  // service, so the account is usable immediately (see requirements R8).
  await createSession(user.id);

  redirect("/protected");
}

export async function signOutAction(): Promise<void> {
  await destroyCurrentSession();

  redirect("/auth/login");
}

/**
 * Handles both password-change paths:
 * - with a `token` field: a one-time link issued by `npm run auth:reset-link`
 * - without one: a signed-in user confirming their current password
 */
export async function updatePasswordAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const password = field(formData, "password");
  const repeatPassword = field(formData, "repeat-password");
  const token = field(formData, "token");

  const passwordError = validatePassword(password, repeatPassword);

  if (passwordError) {
    return { error: passwordError };
  }

  if (token) {
    const reset = await findPasswordReset(token);

    if (!reset || reset.used_at || reset.expires_at <= Date.now()) {
      return {
        error: "This reset link is invalid, already used, or expired.",
      };
    }

    await updateUserPassword(reset.user_id, password);
    await markPasswordResetUsed(token);
    // Any session opened before the reset is no longer trustworthy.
    await destroyAllSessionsForUser(reset.user_id);

    redirect("/auth/login?reset=done");
  }

  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return { error: "Your session expired. Sign in again to change your password." };
  }

  const stored = await findUserById(currentUser.id);
  const currentPassword = field(formData, "current-password");

  if (!stored || !(await verifyPassword(currentPassword, stored.password_hash))) {
    return { error: "Current password is incorrect" };
  }

  await updateUserPassword(currentUser.id, password);
  await destroyAllSessionsForUser(currentUser.id);
  await createSession(currentUser.id);

  redirect("/protected");
}
