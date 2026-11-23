import "server-only";
import { prisma } from "@/lib/prisma";
import { isUuid } from "@/lib/utils/uuid";

/** Favorites a completed poem; does nothing if it's already a favorite or isn't completed. */
export const add = async (userId: string, poemId: string): Promise<void> => {
  if (!isUuid(poemId)) return;
  await prisma.$executeRaw`
    INSERT INTO "favorite" ("userId", "poemId")
    SELECT ${userId}::uuid, "id" FROM "poem"
    WHERE "id" = ${poemId}::uuid AND "completedAt" IS NOT NULL
    ON CONFLICT ("userId", "poemId") DO NOTHING`;
};

export const remove = async (userId: string, poemId: string): Promise<void> => {
  if (!isUuid(poemId)) return;
  await prisma.favorite.deleteMany({ where: { userId, poemId } });
};

export const isFavorited = async (userId: string, poemId: string): Promise<boolean> => {
  if (!isUuid(poemId)) return false;
  return (await prisma.favorite.count({ where: { userId, poemId } })) > 0;
};
