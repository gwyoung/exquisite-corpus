import "server-only";
import { prisma } from "@/lib/prisma";
import { isUuid } from "@/lib/utils/uuid";

/** Records one page load of a completed poem; userId is null for signed-out visitors. */
export const record = async (poemId: string, userId: string | null): Promise<void> => {
  if (!isUuid(poemId)) return;
  await prisma.$executeRaw`
    INSERT INTO "view" ("poemId", "userId")
    SELECT "id", ${userId}::uuid FROM "poem"
    WHERE "id" = ${poemId}::uuid AND "completedAt" IS NOT NULL`;
};
