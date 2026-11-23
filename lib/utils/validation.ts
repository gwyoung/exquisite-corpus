// Shared account and poem rules, used by both the forms (to show requirements
// as the user types) and the server (to enforce them), so the two can't drift
// apart. Safe to import from client components.

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;
export const USERNAME_PATTERN = /^[a-zA-Z0-9_.]+$/;

export type Requirement = {
  label: string;
  met: boolean;
};

export const passwordRequirements = (password: string): Requirement[] => [
  {
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    met: password.length >= PASSWORD_MIN_LENGTH,
  },
  // Only shown once it's broken; nobody needs to be told this up front.
  ...(password.length > PASSWORD_MAX_LENGTH
    ? [{ label: `At most ${PASSWORD_MAX_LENGTH} characters`, met: false }]
    : []),
];

export const usernameRequirements = (username: string): Requirement[] => [
  {
    label: `${USERNAME_MIN_LENGTH}–${USERNAME_MAX_LENGTH} characters`,
    met: username.length >= USERNAME_MIN_LENGTH && username.length <= USERNAME_MAX_LENGTH,
  },
  {
    label: "Only letters, numbers, underscores (_), and periods (.)",
    met: username.length > 0 && USERNAME_PATTERN.test(username),
  },
];

export const allMet = (requirements: Requirement[]) => requirements.every((r) => r.met);

/** Generous on purpose: a safety limit. Matches the column size of Line.text. */
export const LINE_MAX_LENGTH = 500;

/** Collapses line breaks, control characters, and repeated spaces: a line is one line. */
export const normalizeLine = (text: string) =>
  text.replace(/[\s\p{Cc}]+/gu, " ").trim();

/** Why a normalized line can't be saved, or null if it can. */
export const lineError = (text: string): string | null => {
  if (!text) return "Please write something first.";
  if (text.length > LINE_MAX_LENGTH) {
    return `A line can be at most ${LINE_MAX_LENGTH} characters.`;
  }
  return null;
};
