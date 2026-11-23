# Exquisite Corpus

An exquisite-corpse-style poetry game: people write poems together one line at a time, each seeing only the line before theirs. The full poem is revealed once it's complete.

## Tech stack

- [Next.js](https://nextjs.org) (App Router), React, Tailwind CSS
- [Better Auth](https://www.better-auth.com) for authentication (email + password to start)
- [Prisma](https://www.prisma.io) ORM on [Neon](https://neon.tech) Postgres
- Hosted on [Vercel](https://vercel.com)

## Running locally

1. Install dependencies:

   ```bash
   npm install
   ```

   This also runs `prisma generate` (via `postinstall`), which builds the typed database client into `generated/prisma/`. That folder is git-ignored and recreated on every install.

   > npm 11.20+ only runs package install scripts listed under `allowScripts` in `package.json`. Prisma's are approved there (they download Prisma's migration engine). If you upgrade Prisma, npm will warn again. Run `npm install-scripts approve prisma @prisma/engines` and then `npm rebuild prisma @prisma/engines`.

2. Create `.env.local` with the environment variables listed in [Environment variables](#environment-variables). `.env*` files are git-ignored, so secrets never get committed.

3. Apply database migrations to your dev database:

   ```bash
   npm run db:migrate
   ```

4. Start the dev server:

   ```bash
   npm run dev
   ```

   Open <http://localhost:3000>.

## Environment variables

| Variable | Used for | Where to get it |
| --- | --- | --- |
| `DATABASE_URL` | App's database connection (pooled) | Neon console → `dev` branch → Connect, with connection pooling **on** |
| `DATABASE_URL_UNPOOLED` | Prisma migrations (direct connection) | Same screen, with connection pooling **off** |
| `BETTER_AUTH_SECRET` | Signs and encrypts auth cookies and tokens | Generate a random value: `openssl rand -base64 32`. Use a **different** value in each place (local, Vercel). Changing it signs everyone out. |

Locally these point at the Neon `dev` branch. In Vercel they're set automatically by the Neon integration and point at the production branch.

Next.js loads `.env.local` automatically. Prisma's CLI doesn't, so `prisma.config.ts` loads it explicitly.

## Database

The schema lives in [`prisma/schema.prisma`](prisma/schema.prisma), and migrations (versioned SQL files) live in `prisma/migrations/`. The app talks to the database through the client in [`lib/prisma.ts`](lib/prisma.ts), which uses Neon's serverless driver over the pooled `DATABASE_URL`. Migrations use the direct `DATABASE_URL_UNPOOLED` connection.

| Command | What it does |
| --- | --- |
| `npm run db:migrate` | After editing `schema.prisma`: creates a new migration and applies it to the dev database. Add a name, e.g. `npm run db:migrate -- --name add_poems`. |
| `npm run db:deploy` | Applies any pending migrations without creating new ones. The build runs this automatically. |
| `npm run db:studio` | Opens Prisma Studio, a browser UI for viewing and editing data in the dev database. |

**Deployments:** `npm run build` runs `prisma migrate deploy` before `next build`. Every Vercel deploy therefore applies new migrations to its own database first: production to the `main` branch, and previews to their per-preview Neon branch. Locally, `npm run build` applies pending migrations to the dev database.

**Better Auth tables** (`user`, `session`, `account`, `verification`) are written by hand in the schema to match what Better Auth 1.7 expects. IDs are Postgres-generated UUIDs. The `user` table also has `username` (unique, lowercased) and `displayUsername` (original capitalization) from Better Auth's [username plugin](https://www.better-auth.com/docs/plugins/username), which gives every user a unique handle. If a Better Auth upgrade or a new Better Auth plugin needs new columns, add them to the schema and run `npm run db:migrate`. Better Auth checks the schema at runtime and reports anything missing.

## Authentication

Configured in [`lib/auth.ts`](lib/auth.ts). Better Auth's endpoints are mounted at `/api/auth/*` by [`app/api/auth/[...all]/route.ts`](app/api/auth/[...all]/route.ts).

- **Sign-in methods:** email + password, or username + password. Google and magic links are planned for later.
- **Pages:** `/login` has the sign-in and sign-up forms ([`app/login/`](app/login/)), which submit to Server Actions in [`lib/auth-actions.ts`](lib/auth-actions.ts). Pages read the signed-in user through `getCurrentUser()` in [`lib/session.ts`](lib/session.ts). Because Cache Components is on, any component that calls it must render inside a `<Suspense>` boundary.
- **Password rules:** 8–128 characters, with no required mix of character types, following current guidance that length matters more than composition. Username and password rules live in [`lib/validation.ts`](lib/validation.ts), shared by the sign-up form's live checklist and Better Auth's server-side checks.
- **Handles:** every user has a unique handle (Better Auth's username plugin): 3–30 characters, letters/numbers/`_`/`.`, unique regardless of capitalization. The handle is the only public identity in the app. Better Auth's required `name` field is always kept equal to the handle by database hooks in `lib/auth.ts`.
- **Allowed hosts:** Better Auth only accepts requests on `localhost:3000` and `exquisite-corpus*.vercel.app` (production and previews). If the app gets a custom domain, or the Vercel project URL doesn't start with `exquisite-corpus`, add it to `baseURL.allowedHosts` in `lib/auth.ts`.

## Hosting and database setup

This is a record of the one-time setup that has been done for hosting and the database, in case it ever needs to be redone or checked.

### 1. Vercel project

1. Sign in to [vercel.com](https://vercel.com) with GitHub (Hobby plan, which is free for non-commercial use).
2. **Add New → Project**, then import the `exquisite-corpus` GitHub repo with the default Next.js settings.
3. From then on, every push to `main` deploys to production and every other branch or PR gets a preview URL.

### 2. Neon Postgres (via Vercel)

1. In the Vercel project, open the **Storage** tab, choose **Create Database**, and pick **Neon** (free plan).
   - Resource name: `exquisite-corpus-db`.
   - Region: US East (N. Virginia), `us-east-1`, which matches Vercel's default function region (`iad1`) so database queries stay fast.
   - Leave the **Auth** option ("built-in authentication for app users") **unchecked**. That's Neon's managed auth service; this app runs Better Auth itself.
2. Connect it to the project for all environments, with these options:
   - **Create database branch for deployment:** check **Preview**, leave **Production** unchecked. Each preview deployment then gets its own Neon branch copied from production, so testing never touches real data. Production always uses the main database. Preview branches count toward the free plan's branch limit. The integration deletes a preview's Neon branch once its Git branch is deleted (e.g. after merging a PR). If any are ever left behind, delete them in the Neon console.
   - **Custom Prefix:** `DATABASE` (instead of the default `STORAGE`), so the variables are named `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, and so on.

   Vercel adds these variables to the project's environment variables automatically.
3. The Neon project's default (`main`) branch is the **production** database.

### 3. Neon `dev` branch for local development

A Neon branch is an isolated copy of the database, so local development never touches production data.

1. Open the Neon console (from the Vercel Storage tab, choose **Open in Neon**).
2. Go to **Branches → Create branch**, name it `dev`, branch it from `main`, and set auto-delete to **Never**. This branch is long-lived; letting it expire would wipe local data and require new connection strings.
3. Click **Connect** on the `dev` branch and copy two connection strings into `.env.local`:
   - pooling **on** → `DATABASE_URL`
   - pooling **off** → `DATABASE_URL_UNPOOLED`
4. Run `npm run db:migrate` to create the tables on the `dev` branch.

### 4. Auth secret

- **Locally:** add `BETTER_AUTH_SECRET` to `.env.local` (generate with `openssl rand -base64 32`).
- **Vercel:** in the project, go to **Settings → Environment Variables** and add `BETTER_AUTH_SECRET` **twice**, each with its own newly generated value:
  - one with only **Production** checked
  - one with only **Preview** checked

  Separate secrets mean a leak from a preview deployment (which runs unmerged branch code) can't be used to forge production sessions. Redeploy afterwards so the change takes effect.
