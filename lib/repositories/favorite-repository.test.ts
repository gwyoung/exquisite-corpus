import { beforeEach, expect, test } from "vitest";
import { prisma } from "@/lib/prisma";
import { createCompletedPoem, createUser } from "@/test/fixtures";
import * as favorites from "./favorite-repository";
import * as poems from "./poem-repository";

let ana: string;
let ben: string;

beforeEach(async () => {
  [ana, ben] = await Promise.all(["Ana", "Ben"].map(createUser));
});

test("adding and removing affects only that user", async () => {
  const id = await createCompletedPoem(ana, ben);
  await favorites.add(ana, id);
  await favorites.add(ben, id);
  await favorites.remove(ana, id);
  expect(await favorites.isFavorited(ana, id)).toBe(false);
  expect(await favorites.isFavorited(ben, id)).toBe(true);
});

test("favoriting twice, even at once, counts once", async () => {
  const id = await createCompletedPoem(ana, ben);
  await Promise.all([favorites.add(ana, id), favorites.add(ana, id)]);
  expect(await prisma.favorite.count()).toBe(1);
});

test("in-progress poems can't be favorited", async () => {
  const id = await poems.create(ana, "first");
  await favorites.add(ben, id);
  expect(await favorites.isFavorited(ben, id)).toBe(false);
});

test("malformed ids are ignored", async () => {
  await favorites.add(ana, "nope");
  await favorites.remove(ana, "nope");
  expect(await favorites.isFavorited(ana, "nope")).toBe(false);
});
