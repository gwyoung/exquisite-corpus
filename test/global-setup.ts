import { execFileSync } from "node:child_process";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma/client";
import { loadTestEnv, TEST_EMAIL_DOMAIN } from "./test-env";

// Runs once before the integration tests: makes sure this really is the test
// database, then brings its tables up to date and empties them.

const setup = async () => {
  const { pooled, direct, endpoint } = loadTestEnv();
  const prisma = new PrismaClient({
    adapter: new PrismaNeon({ connectionString: pooled }),
  });

  try {
    // Real accounts mean this is either a fresh copy of production or, if the
    // wrong connection string was pasted, production itself. Never guess.
    const realUsers = await prisma.user.count({
      where: { NOT: { email: { endsWith: TEST_EMAIL_DOMAIN } } },
    });
    if (realUsers > 0 && process.env.RESET_TEST_DB !== endpoint) {
      throw new Error(
        `The database in .env.test.local has ${realUsers} real account(s), so the tests won't touch it.\n` +
          "In the Neon console, check that the endpoint below belongs to the `test` branch. " +
          "If it does, erase the data copied from production (needed only once) with:\n\n" +
          `  RESET_TEST_DB=${endpoint} npm test\n`,
      );
    }

    execFileSync("npx", ["prisma", "migrate", "deploy"], {
      env: { ...process.env, DATABASE_URL: pooled, DATABASE_URL_UNPOOLED: direct },
      stdio: ["ignore", "ignore", "inherit"],
    });
    await prisma.$executeRaw`TRUNCATE "user", "poem", "verification" CASCADE`;
  } finally {
    await prisma.$disconnect();
  }
};

export default setup;
