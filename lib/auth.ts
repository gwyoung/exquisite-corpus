import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";
import { prisma } from "@/lib/prisma";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN,
} from "@/lib/utils/validation";

const badRequest = (message: string) => new APIError("BAD_REQUEST", { message });

/**
 * Given the (already normalized, validated) username and an optional display
 * form, returns consistent values for all three handle fields.
 */
const handleFields = (normalized: string, displayUsername: unknown) => {
  if (displayUsername === undefined || displayUsername === null || displayUsername === "") {
    return { username: normalized, displayUsername: normalized, name: normalized };
  }
  if (typeof displayUsername !== "string" || displayUsername.toLowerCase() !== normalized) {
    throw badRequest("Display username must match the username (only capitalization may differ).");
  }
  return { username: normalized, displayUsername, name: displayUsername };
};

export const auth = betterAuth({
  // The app runs on several hosts: localhost in development, plus the
  // production and per-branch preview URLs on Vercel. Better Auth works out
  // the base URL from each request, but only for these hosts.
  baseURL: {
    allowedHosts: ["localhost:3000", "exquisite-corpus*.vercel.app"],
  },
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  advanced: {
    database: {
      // Use Postgres-generated UUIDs (gen_random_uuid()) for all auth table IDs.
      generateId: "uuid",
    },
  },
  emailAndPassword: {
    enabled: true,
    // Length-only rules, no "must contain a symbol" style composition rules.
    minPasswordLength: PASSWORD_MIN_LENGTH,
    maxPasswordLength: PASSWORD_MAX_LENGTH,
  },
  databaseHooks: {
    user: {
      // The app's only public identity is the user's handle. Keep the three
      // fields that describe it consistent: `username` (unique, lowercased),
      // `displayUsername` (same handle, original casing), and `name` (required
      // by Better Auth, always equal to `displayUsername`).
      create: {
        before: async (user) => {
          if (typeof user.username !== "string" || !user.username) {
            throw badRequest("A username is required.");
          }
          return { data: { ...user, ...handleFields(user.username, user.displayUsername) } };
        },
      },
      update: {
        before: async (user) => {
          const hasUsername = typeof user.username === "string" && user.username.length > 0;
          if (!hasUsername) {
            if (user.displayUsername !== undefined) {
              throw badRequest("To change your handle, send the new username.");
            }
            return; // Not a handle change (e.g. emailVerified); leave as is.
          }
          return { data: { ...user, ...handleFields(user.username as string, user.displayUsername) } };
        },
      },
    },
  },
  plugins: [
    // Unique user handles, stored lowercased in `username`, original casing
    // kept in `displayUsername`. Rules are shared with the sign-up form.
    username({
      minUsernameLength: USERNAME_MIN_LENGTH,
      maxUsernameLength: USERNAME_MAX_LENGTH,
      usernameValidator: (value) => USERNAME_PATTERN.test(value),
    }),
    // Lets server actions that call auth.api set session cookies. Must be last.
    nextCookies(),
  ],
});
