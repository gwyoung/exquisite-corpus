import { afterAll, beforeEach } from "vitest";
import { loadTestEnv } from "./test-env";

// Must be set before lib/prisma is imported, hence the dynamic import below.
process.env.DATABASE_URL = loadTestEnv().pooled;
const { prisma } = await import("@/lib/prisma");

beforeEach(async () => {
  await prisma.poem.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.poem.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});
