import { beforeEach, describe, expect, test } from "vitest";
import { prisma } from "@/lib/prisma";
import { createCompletedPoem, createUser } from "@/test/fixtures";
import * as favorites from "./favorite-repository";
import * as poems from "./poem-repository";
import * as users from "./user-repository";
import * as views from "./view-repository";

let ana: string;
let ben: string;

beforeEach(async () => {
  [ana, ben] = await Promise.all(["Ana", "Ben"].map(createUser));
});

describe("findById", () => {
  test("returns only the id and handle", async () => {
    expect(await users.findById(ana)).toEqual({ id: ana, handle: "Ana" });
  });

  test("returns null for unknown and malformed ids", async () => {
    expect(await users.findById(crypto.randomUUID())).toBeNull();
    expect(await users.findById("nope")).toBeNull();
  });
});

describe("delete", () => {
  test("anonymizes lines and views, and deletes favorites and sessions", async () => {
    const id = await createCompletedPoem(ana, ben);
    await views.record(id, ana);
    await favorites.add(ana, id);
    await prisma.session.create({
      data: { userId: ana, token: crypto.randomUUID(), expiresAt: new Date() },
    });

    await users.delete(ana);

    expect(await users.findById(ana)).toBeNull();
    expect(await poems.findCompletedById(id)).toMatchObject({
      lines: [{ text: "first line" }, { text: "last line" }],
      viewCount: 1,
      favoriteCount: 0,
    });
    expect(await prisma.line.count({ where: { userId: null } })).toBe(1);
    expect(await prisma.session.count()).toBe(0);
  });

  test("leaves other users alone, and is safe to repeat", async () => {
    await users.delete(ana);
    await users.delete(ana);
    expect(await users.findById(ben)).not.toBeNull();
  });
});
