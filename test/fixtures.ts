import { prisma } from "@/lib/prisma";
import * as poems from "@/lib/repositories/poem-repository";
import { TEST_EMAIL_DOMAIN } from "./test-env";

/** Creates a user and returns their id. */
export const createUser = async (handle: string): Promise<string> => {
  const user = await prisma.user.create({
    data: {
      name: handle,
      username: handle.toLowerCase(),
      displayUsername: handle,
      email: `${handle.toLowerCase()}${TEST_EMAIL_DOMAIN}`,
    },
  });
  return user.id;
};

/** Gives a user an active lock on a specific poem, bypassing the random choice. */
export const lockPoem = async (poemId: string, userId: string) => {
  await prisma.$executeRaw`
    UPDATE "poem" SET "lockedByUserId" = ${userId}::uuid,
      "lockExpiresAt" = now() + interval '5 minutes'
    WHERE "id" = ${poemId}::uuid`;
};

export const expireLock = async (poemId: string) => {
  await prisma.$executeRaw`
    UPDATE "poem" SET "lockExpiresAt" = now() - interval '1 second'
    WHERE "id" = ${poemId}::uuid`;
};

/** Adds a line as a user who may add one. */
export const addLine = async (poemId: string, userId: string, text: string, complete = false) => {
  await lockPoem(poemId, userId);
  const result = await poems.writeLine(userId, poemId, text, { complete });
  if (!result.ok) throw new Error("addLine fixture: the line was rejected");
};

/** A completed two-line poem. Returns its id. */
export const createCompletedPoem = async (starterId: string, finisherId: string) => {
  const id = await poems.create(starterId, "first line");
  await addLine(id, finisherId, "last line", true);
  return id;
};
