"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/validation";

export type AuthFormState = {
  error?: string;
  /** Echoed back so the form keeps what the user typed (never the password). */
  values?: Record<string, string>;
};

const field = (formData: FormData, name: string) => {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
};

/** Turns a Better Auth error into a message that's safe to show the user. */
const messageFor = (error: unknown, fallback: string) => {
  if (!(error instanceof APIError)) {
    console.error(error);
    return "Something went wrong. Please try again.";
  }
  switch (error.body?.code) {
    // Same message for a bad identifier or a bad password, so the form
    // doesn't reveal which accounts exist.
    case "INVALID_EMAIL_OR_PASSWORD":
    case "INVALID_USERNAME_OR_PASSWORD":
    case "INVALID_PASSWORD":
      return "That email/username and password don't match.";
    case "PASSWORD_TOO_SHORT":
      return `Your password needs at least ${PASSWORD_MIN_LENGTH} characters.`;
    case "PASSWORD_TOO_LONG":
      return `Your password can be at most ${PASSWORD_MAX_LENGTH} characters.`;
    case "USERNAME_IS_ALREADY_TAKEN":
      return "That username is taken. Please choose another.";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "An account with that email already exists. Try signing in instead.";
    default:
      return error.body?.message ?? fallback;
  }
};

export const signUp = async (
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> => {
  const email = field(formData, "email");
  const username = field(formData, "username");
  // Passwords aren't trimmed: spaces are allowed and count.
  const password = String(formData.get("password") ?? "");
  const values = { email, username };

  if (!email || !username || !password) {
    return { error: "Please fill in every field.", values };
  }

  try {
    await auth.api.signUpEmail({
      // `name` is required by Better Auth; the database hook in lib/auth.ts
      // replaces it with the handle.
      body: { email, username, password, name: username },
      headers: await headers(),
    });
  } catch (error) {
    return { error: messageFor(error, "Couldn't create your account."), values };
  }

  redirect("/");
};

export const signIn = async (
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> => {
  const identifier = field(formData, "identifier");
  const password = String(formData.get("password") ?? "");
  const values = { identifier };

  if (!identifier || !password) {
    return { error: "Please enter your email or username and your password.", values };
  }

  try {
    const requestHeaders = await headers();
    // Handles can't contain "@", so anything with one is an email address.
    if (identifier.includes("@")) {
      await auth.api.signInEmail({
        body: { email: identifier, password },
        headers: requestHeaders,
      });
    } else {
      await auth.api.signInUsername({
        body: { username: identifier, password },
        headers: requestHeaders,
      });
    }
  } catch (error) {
    return { error: messageFor(error, "Couldn't sign you in."), values };
  }

  redirect("/");
};

export const signOut = async () => {
  await auth.api.signOut({ headers: await headers() });
  redirect("/");
};
