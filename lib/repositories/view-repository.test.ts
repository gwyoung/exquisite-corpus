import { beforeEach, expect, test } from "vitest";
import { prisma } from "@/lib/prisma";
import { createCompletedPoem, createUser } from "@/test/fixtures";
import * as poems from "./poem-repository";
import * as views from "./view-repository";

let ana: string;
let ben: string;

beforeEach(async () => {
  [ana, ben] = await Promise.all(["Ana", "Ben"].map(createUser));
});

test("every page load counts, signed in or not", async () => {
  const id = await createCompletedPoem(ana, ben);
  await views.record(id, ana);
  await views.record(id, ana);
  await views.record(id, null);
  expect((await poems.findCompletedById(id))!.viewCount).toBe(3);
});

test("in-progress, unknown, and malformed poems aren't counted", async () => {
  await views.record(await poems.create(ana, "first"), ben);
  await views.record(crypto.randomUUID(), ben);
  await views.record("nope", ben);
  expect(await prisma.view.count()).toBe(0);
});
