import "server-only";
import { prisma } from "@/lib/prisma";
import { isUuid } from "@/lib/utils/uuid";
import { lineError, normalizeLine } from "@/lib/utils/validation";

// Owns the poem and line tables. A line only ever changes along with its poem,
// so every write here is one SQL statement: it all happens or none of it does.
// Times come from Postgres (now()), so locks don't depend on app server clocks.

export const LOCK_MINUTES = 5;
export const POEMS_PER_PAGE = 20;

export type CheckedOutPoem = {
  id: string;
  /** All the contributor gets to see of the poem. */
  lastLine: string;
  /** Whole seconds left when this was read; a countdown for display only. */
  secondsLeft: number;
};

export type WriteLineResult = { ok: true } | { ok: false; reason: "lock-lost" };

export type PoemSort = "recent" | "views" | "favorites";

const validLine = (text: string) => {
  const line = normalizeLine(text);
  const error = lineError(line);
  if (error) throw new Error(error);
  return line;
};

/** Starts a poem with its first line. Returns the poem's id. */
export const create = async (userId: string, text: string): Promise<string> => {
  const line = validLine(text);
  const [row] = await prisma.$queryRaw<{ poemId: string }[]>`
    WITH new_poem AS (
      INSERT INTO "poem" DEFAULT VALUES RETURNING "id"
    )
    INSERT INTO "line" ("poemId", "userId", "text")
    SELECT "id", ${userId}::uuid, ${line} FROM new_poem
    RETURNING "poemId"`;
  return row.poemId;
};

/** The poem this user currently has checked out, if any. */
export const findCheckedOut = async (userId: string): Promise<CheckedOutPoem | null> => {
  const [poem] = await prisma.$queryRaw<CheckedOutPoem[]>`
    SELECT
      p."id",
      last_line."text" AS "lastLine",
      floor(extract(epoch FROM p."lockExpiresAt" - now()))::int AS "secondsLeft"
    FROM "poem" p
    JOIN LATERAL (
      SELECT "text" FROM "line" WHERE "poemId" = p."id"
      ORDER BY "createdAt" DESC LIMIT 1
    ) last_line ON true
    WHERE p."lockedByUserId" = ${userId}::uuid
      AND p."lockExpiresAt" > now()
      AND p."completedAt" IS NULL
    ORDER BY p."lockExpiresAt" DESC
    LIMIT 1`;
  return poem ?? null;
};

/**
 * Locks a random poem this user can add to, or returns null if there are none.
 * If they already have one checked out they get that one back with its
 * original deadline, so refreshing can't extend the lock or reroll the poem.
 */
export const checkOutRandom = async (userId: string): Promise<CheckedOutPoem | null> => {
  const current = await findCheckedOut(userId);
  if (current) return current;

  // FOR UPDATE SKIP LOCKED makes simultaneous requests pick different poems.
  // IS DISTINCT FROM (rather than <>) keeps poems whose last author deleted
  // their account, where the line's userId is null.
  await prisma.$executeRaw`
    UPDATE "poem"
    SET "lockedByUserId" = ${userId}::uuid,
        "lockExpiresAt" = now() + make_interval(mins => ${LOCK_MINUTES}::int)
    WHERE "id" = (
      SELECT p."id" FROM "poem" p
      WHERE p."completedAt" IS NULL
        AND (p."lockExpiresAt" IS NULL OR p."lockExpiresAt" <= now())
        AND (
          SELECT l."userId" FROM "line" l WHERE l."poemId" = p."id"
          ORDER BY l."createdAt" DESC LIMIT 1
        ) IS DISTINCT FROM ${userId}::uuid
      ORDER BY random()
      LIMIT 1
      FOR UPDATE OF p SKIP LOCKED
    )`;
  return findCheckedOut(userId);
};

/**
 * Adds a line to a poem the user has checked out, releasing the lock and
 * optionally completing the poem. The line is only inserted if the update
 * matched, and the update locks the poem's row, so of two simultaneous
 * submissions the second finds the lock already released and is rejected.
 *
 * Completing here always leaves at least two lines, because every poem is
 * created with its first.
 */
export const writeLine = async (
  userId: string,
  poemId: string,
  text: string,
  { complete = false }: { complete?: boolean } = {},
): Promise<WriteLineResult> => {
  const line = validLine(text);
  if (!isUuid(poemId)) return { ok: false, reason: "lock-lost" };

  const inserted = await prisma.$executeRaw`
    WITH released AS (
      UPDATE "poem" p
      SET "lockedByUserId" = NULL,
          "lockExpiresAt" = NULL,
          "completedAt" = CASE WHEN ${complete}::boolean THEN now() END
      WHERE p."id" = ${poemId}::uuid
        AND p."completedAt" IS NULL
        AND p."lockedByUserId" = ${userId}::uuid
        AND p."lockExpiresAt" > now()
        -- Checkout already ensures this; a second guard on the game's main rule.
        AND (
          SELECT l."userId" FROM "line" l WHERE l."poemId" = p."id"
          ORDER BY l."createdAt" DESC LIMIT 1
        ) IS DISTINCT FROM ${userId}::uuid
      RETURNING p."id"
    )
    INSERT INTO "line" ("poemId", "userId", "text")
    SELECT "id", ${userId}::uuid, ${line} FROM released`;
  return inserted === 1 ? { ok: true } : { ok: false, reason: "lock-lost" };
};

/**
 * A completed poem in full, or null if it doesn't exist or is in progress.
 * Lines say whether the viewer wrote them, without exposing author ids.
 */
export const findCompletedById = async (id: string, viewerId?: string) => {
  if (!isUuid(id)) return null;

  const poem = await prisma.poem.findFirst({
    where: { id, completedAt: { not: null } },
    select: {
      id: true,
      title: true,
      completedAt: true,
      lines: {
        orderBy: { createdAt: "asc" },
        select: { id: true, text: true, userId: true },
      },
      _count: { select: { views: true, favorites: true } },
    },
  });
  if (!poem) return null;

  const { lines, _count, ...rest } = poem;
  return {
    ...rest,
    lines: lines.map((line) => ({
      id: line.id,
      text: line.text,
      isMine: viewerId !== undefined && line.userId === viewerId,
    })),
    viewCount: _count.views,
    favoriteCount: _count.favorites,
  };
};

const orderFor = (sort: PoemSort) => {
  if (sort === "views") return { views: { _count: "desc" as const } };
  if (sort === "favorites") return { favorites: { _count: "desc" as const } };
  return { completedAt: "desc" as const };
};

/**
 * One page of completed poems, each with its first line as a preview, plus
 * how many poems match across all pages.
 */
export const listCompleted = async ({
  contributorId,
  favoritedById,
  sort = "recent",
  page = 1,
}: {
  /** Only poems this user wrote a line of. */
  contributorId?: string;
  /** Only poems this user favorited. */
  favoritedById?: string;
  sort?: PoemSort;
  page?: number;
} = {}) => {
  const where = {
    completedAt: { not: null },
    ...(contributorId && { lines: { some: { userId: contributorId } } }),
    ...(favoritedById && { favorites: { some: { userId: favoritedById } } }),
  };

  const [rows, totalCount] = await Promise.all([
    prisma.poem.findMany({
      where,
      // Ties fall back to newest, then id, so the order is always the same.
      orderBy: [orderFor(sort), { completedAt: "desc" }, { id: "asc" }],
      skip: (page - 1) * POEMS_PER_PAGE,
      take: POEMS_PER_PAGE,
      select: {
        id: true,
        title: true,
        completedAt: true,
        lines: { orderBy: { createdAt: "asc" }, take: 1, select: { text: true } },
        _count: { select: { views: true, favorites: true } },
      },
    }),
    prisma.poem.count({ where }),
  ]);

  return {
    poems: rows.map(({ lines, _count, ...poem }) => ({
      ...poem,
      firstLine: lines[0]?.text ?? "",
      viewCount: _count.views,
      favoriteCount: _count.favorites,
    })),
    totalCount,
  };
};
