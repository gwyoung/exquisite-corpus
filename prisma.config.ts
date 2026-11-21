import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Locally, connection strings live in .env.local (the file Next.js reads).
// On Vercel there is no .env.local; the variables come from the project settings.
config({ path: ".env.local", quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrations need a direct (non-pooled) connection.
    url: env("DATABASE_URL_UNPOOLED"),
  },
});
