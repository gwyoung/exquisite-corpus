import "server-only";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export type CurrentUser = {
  id: string;
  /** The handle as the user typed it, e.g. "Greg_Y". */
  handle: string;
};

/**
 * The signed-in user, or null. This is the one place that reads the session
 * (Next.js's "data access layer" pattern), and it returns only what the UI
 * needs, never the raw session or email.
 *
 * Reads request headers, so with Cache Components any component that calls
 * it must render inside a <Suspense> boundary.
 */
export const getCurrentUser = async (): Promise<CurrentUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const { id, displayUsername, username, name } = session.user;
  return { id, handle: displayUsername ?? username ?? name };
};
