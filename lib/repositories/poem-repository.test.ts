import { beforeEach, describe, expect, test } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  addLine,
  createCompletedPoem,
  createUser,
  expireLock,
  lockPoem,
} from "@/test/fixtures";
import * as favorites from "./favorite-repository";
import * as poems from "./poem-repository";
import * as views from "./view-repository";

let ana: string;
let ben: string;
let cam: string;

beforeEach(async () => {
  [ana, ben, cam] = await Promise.all(["Ana", "Ben", "Cam"].map(createUser));
});

const lineTexts = async (poemId: string) => {
  const lines = await prisma.line.findMany({
    where: { poemId },
    orderBy: { createdAt: "asc" },
  });
  return lines.map((line) => line.text);
};

describe("create", () => {
  test("saves an unlocked, in-progress poem with its normalized first line", async () => {
    const id = await poems.create(ana, "  one\ntwo ");
    expect(await lineTexts(id)).toEqual(["one two"]);
    expect(await prisma.poem.findUnique({ where: { id } })).toMatchObject({
      completedAt: null,
      lockedByUserId: null,
    });
  });

  test("saves nothing if the line is invalid", async () => {
    await expect(poems.create(ana, "  ")).rejects.toThrow();
    expect(await prisma.poem.count()).toBe(0);
  });
});

describe("checkOutRandom", () => {
  test("returns null when there's nothing to add to", async () => {
    expect(await poems.checkOutRandom(ana)).toBeNull();
  });

  test("shows only the last line, with five minutes to write", async () => {
    const id = await poems.create(ana, "first");
    await addLine(id, ben, "second");
    const poem = await poems.checkOutRandom(cam);
    expect(poem).toEqual({ id, lastLine: "second", secondsLeft: expect.any(Number) });
    expect(poem!.secondsLeft).toBeGreaterThan(285);
    expect(poem!.secondsLeft).toBeLessThanOrEqual(300);
  });

  test("never offers a poem whose last line is the user's own", async () => {
    const id = await poems.create(ana, "first");
    expect(await poems.checkOutRandom(ana)).toBeNull();
    await addLine(id, ben, "second");
    expect((await poems.checkOutRandom(ana))?.id).toBe(id);
  });

  test("never offers a completed poem", async () => {
    await createCompletedPoem(ana, ben);
    expect(await poems.checkOutRandom(cam)).toBeNull();
  });

  test("skips a locked poem until its lock expires", async () => {
    const id = await poems.create(ana, "first");
    await poems.checkOutRandom(ben);
    expect(await poems.checkOutRandom(cam)).toBeNull();
    await expireLock(id);
    expect((await poems.checkOutRandom(cam))?.id).toBe(id);
  });

  test("asking again returns the same poem without extending the deadline", async () => {
    for (let i = 0; i < 5; i++) await poems.create(ana, `poem ${i}`);
    const first = await poems.checkOutRandom(ben);
    const before = await prisma.poem.findUnique({ where: { id: first!.id } });
    const again = await poems.checkOutRandom(ben);
    const after = await prisma.poem.findUnique({ where: { id: first!.id } });
    expect(again!.id).toBe(first!.id);
    expect(after!.lockExpiresAt).toEqual(before!.lockExpiresAt);
  });

  test("offers poems whose last author deleted their account", async () => {
    const id = await poems.create(ana, "first");
    await prisma.user.delete({ where: { id: ana } });
    expect((await poems.checkOutRandom(ben))?.id).toBe(id);
  });

  test("gives one poem to only one of many simultaneous users", async () => {
    await poems.create(ana, "first");
    const users = await Promise.all(Array.from({ length: 10 }, (_, i) => createUser(`Racer${i}`)));
    const results = await Promise.all(users.map(poems.checkOutRandom));
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  test("gives simultaneous users different poems", async () => {
    await poems.create(ana, "a");
    await poems.create(ana, "b");
    const [one, two] = await Promise.all([ben, cam].map(poems.checkOutRandom));
    expect(one).not.toBeNull();
    expect(two).not.toBeNull();
    expect(one!.id).not.toBe(two!.id);
  });
});

describe("writeLine", () => {
  const rejected = { ok: false, reason: "lock-lost" };
  let poemId: string;

  beforeEach(async () => {
    poemId = await poems.create(ana, "first");
  });

  test("adds the line and releases the lock", async () => {
    await lockPoem(poemId, ben);
    expect(await poems.writeLine(ben, poemId, "second")).toEqual({ ok: true });
    expect(await lineTexts(poemId)).toEqual(["first", "second"]);
    expect(await prisma.poem.findUnique({ where: { id: poemId } })).toMatchObject({
      completedAt: null,
      lockedByUserId: null,
      lockExpiresAt: null,
    });
  });

  test("can complete the poem", async () => {
    await lockPoem(poemId, ben);
    await poems.writeLine(ben, poemId, "last", { complete: true });
    const poem = await prisma.poem.findUnique({ where: { id: poemId } });
    expect(poem!.completedAt).not.toBeNull();
  });

  test("is rejected without a lock", async () => {
    expect(await poems.writeLine(ben, poemId, "second")).toEqual(rejected);
    expect(await lineTexts(poemId)).toEqual(["first"]);
  });

  test("is rejected when someone else holds the lock, who keeps it", async () => {
    await lockPoem(poemId, ben);
    expect(await poems.writeLine(cam, poemId, "second")).toEqual(rejected);
    expect((await poems.findCheckedOut(ben))?.id).toBe(poemId);
  });

  test("is rejected, and can't complete, once the lock expires", async () => {
    await lockPoem(poemId, ben);
    await expireLock(poemId);
    expect(await poems.writeLine(ben, poemId, "late", { complete: true })).toEqual(rejected);
    const poem = await prisma.poem.findUnique({ where: { id: poemId } });
    expect(poem!.completedAt).toBeNull();
    expect(await lineTexts(poemId)).toEqual(["first"]);
  });

  test("never allows two lines in a row, even with a lock", async () => {
    await lockPoem(poemId, ana);
    expect(await poems.writeLine(ana, poemId, "second")).toEqual(rejected);
  });

  test("is rejected on a completed poem, even with a lock", async () => {
    await addLine(poemId, ben, "last", true);
    await lockPoem(poemId, cam);
    expect(await poems.writeLine(cam, poemId, "more")).toEqual(rejected);
  });

  test("an invalid line throws and keeps the lock", async () => {
    await lockPoem(poemId, ben);
    await expect(poems.writeLine(ben, poemId, " ")).rejects.toThrow();
    await expect(poems.writeLine(ben, poemId, "x".repeat(501))).rejects.toThrow();
    expect((await poems.findCheckedOut(ben))?.id).toBe(poemId);
  });

  test("saves one line from simultaneous submissions", async () => {
    await lockPoem(poemId, ben);
    const results = await Promise.all(
      Array.from({ length: 10 }, () => poems.writeLine(ben, poemId, "second")),
    );
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(await lineTexts(poemId)).toEqual(["first", "second"]);
  });

  test("is rejected for a malformed id", async () => {
    expect(await poems.writeLine(ben, "nope", "second")).toEqual(rejected);
  });
});

describe("findCompletedById", () => {
  test("hides in-progress poems, even from the starter", async () => {
    const id = await poems.create(ana, "first");
    expect(await poems.findCompletedById(id, ana)).toBeNull();
  });

  test("returns null for unknown and malformed ids", async () => {
    expect(await poems.findCompletedById(crypto.randomUUID())).toBeNull();
    expect(await poems.findCompletedById("nope")).toBeNull();
  });

  test("returns lines in order, marking all of the viewer's", async () => {
    const id = await poems.create(ana, "one");
    await addLine(id, ben, "two");
    await addLine(id, ana, "three", true);

    const poem = await poems.findCompletedById(id, ana);
    expect(poem!.lines.map(({ text, isMine }) => [text, isMine])).toEqual([
      ["one", true],
      ["two", false],
      ["three", true],
    ]);
  });

  test("marks nothing for signed-out visitors, even on anonymized lines", async () => {
    const id = await createCompletedPoem(ana, ben);
    await prisma.user.delete({ where: { id: ana } });
    const poem = await poems.findCompletedById(id);
    expect(poem!.lines.map((line) => line.isMine)).toEqual([false, false]);
  });

  test("doesn't expose author ids", async () => {
    const id = await createCompletedPoem(ana, ben);
    expect(JSON.stringify(await poems.findCompletedById(id, ana))).not.toContain(ben);
  });
});

describe("listCompleted", () => {
  const ids = async (options?: Parameters<typeof poems.listCompleted>[0]) =>
    (await poems.listCompleted(options)).poems.map((poem) => poem.id);

  test("leaves out in-progress poems", async () => {
    await poems.create(ana, "first");
    expect(await poems.listCompleted()).toEqual({ poems: [], totalCount: 0 });
  });

  test("includes a first-line preview and counts", async () => {
    const id = await createCompletedPoem(ana, ben);
    await views.record(id, null);
    await favorites.add(cam, id);
    const { poems: list } = await poems.listCompleted();
    expect(list).toMatchObject([
      { id, firstLine: "first line", viewCount: 1, favoriteCount: 1 },
    ]);
  });

  test("sorts by recent, views, and favorites", async () => {
    const viewed = await createCompletedPoem(ana, ben);
    const favorited = await createCompletedPoem(ana, ben);
    const newest = await createCompletedPoem(ana, ben);
    await views.record(viewed, null);
    await favorites.add(cam, favorited);

    expect(await ids()).toEqual([newest, favorited, viewed]);
    expect(await ids({ sort: "views" })).toEqual([viewed, newest, favorited]);
    expect(await ids({ sort: "favorites" })).toEqual([favorited, newest, viewed]);
  });

  test("filters by contributor and by favorites, and counts to match", async () => {
    const mine = await createCompletedPoem(ana, ben);
    const other = await createCompletedPoem(ben, cam);
    await favorites.add(ana, other);

    expect(await ids({ contributorId: ana })).toEqual([mine]);
    expect(await ids({ favoritedById: ana })).toEqual([other]);
    expect((await poems.listCompleted({ contributorId: ana })).totalCount).toBe(1);
    expect((await poems.listCompleted()).totalCount).toBe(2);
  });

  test("pages without overlaps or gaps, even when dates tie", async () => {
    const total = poems.POEMS_PER_PAGE + 3;
    const completedAt = new Date();
    await prisma.poem.createMany({ data: Array.from({ length: total }, () => ({ completedAt })) });

    const one = await poems.listCompleted({ page: 1 });
    const two = await poems.listCompleted({ page: 2 });
    expect([one.poems.length, two.poems.length]).toEqual([poems.POEMS_PER_PAGE, 3]);
    expect([one.totalCount, two.totalCount]).toEqual([total, total]);
    expect(new Set([...one.poems, ...two.poems].map((poem) => poem.id)).size).toBe(total);
  });
});
