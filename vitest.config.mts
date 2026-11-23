import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const at = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// Two projects: unit tests (no database), and integration tests, which run the
// repositories against the Neon `test` branch. See "Testing" in README.md.
export default defineConfig({
  resolve: {
    alias: {
      "@": at("."),
      // Next.js provides this at build time; outside Next it's a no-op.
      "server-only": at("./test/server-only.ts"),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: { name: "unit", include: ["lib/utils/**/*.test.ts"] },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["lib/repositories/**/*.test.ts"],
          globalSetup: ["./test/global-setup.ts"],
          setupFiles: ["./test/integration-setup.ts"],
          // The files share one database, so they run one at a time.
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 30_000,
        },
      },
    ],
  },
});
