import { existsSync, readFileSync } from "node:fs";
import { parse } from "dotenv";

const readEnv = (path: string) => (existsSync(path) ? parse(readFileSync(path)) : {});

/** The Neon endpoint in a connection string; pooled and direct strings give the same one. */
const endpointOf = (url: string) => new URL(url).hostname.replace("-pooler", "");

/** The test database's settings. Throws unless they're complete and aren't the dev database. */
export const loadTestEnv = () => {
  const { DATABASE_URL: pooled, DATABASE_URL_UNPOOLED: direct } = readEnv(".env.test.local");
  if (!pooled || !direct) {
    throw new Error(
      "Integration tests need DATABASE_URL and DATABASE_URL_UNPOOLED in .env.test.local " +
        '(see "Testing" in README.md). To run only the unit tests: npm run test:unit',
    );
  }

  const endpoint = endpointOf(pooled);
  if (endpointOf(direct) !== endpoint) {
    throw new Error("The two URLs in .env.test.local point at different databases.");
  }

  const dev = readEnv(".env.local");
  for (const url of [dev.DATABASE_URL, dev.DATABASE_URL_UNPOOLED]) {
    if (url && endpointOf(url) === endpoint) {
      throw new Error(".env.test.local points at the dev database. Use the Neon `test` branch.");
    }
  }

  return { pooled, direct, endpoint };
};

/** Every test user's email ends with this, which is how test data is recognized. */
export const TEST_EMAIL_DOMAIN = "@test.invalid";
