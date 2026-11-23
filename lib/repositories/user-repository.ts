import "server-only";
import { prisma } from "@/lib/prisma";
import { isUuid } from "@/lib/utils/uuid";

/** A user's public identity; never their email. */
export const findById = async (id: string) => {
  if (!isUuid(id)) return null;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, username: true, displayUsername: true },
  });
  if (!user) return null;
  return { id: user.id, handle: user.displayUsername ?? user.username ?? user.name };
};

/**
 * Deletes an account. The foreign keys do the rest: lines and views are kept
 * but anonymized; favorites, sessions, and sign-in methods are deleted.
 */
const deleteUser = async (id: string): Promise<void> => {
  await prisma.user.deleteMany({ where: { id } });
};
export { deleteUser as delete };
