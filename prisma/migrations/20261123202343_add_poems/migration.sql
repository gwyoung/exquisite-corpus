-- CreateTable
CREATE TABLE "poem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(3),
    "lockedByUserId" UUID,
    "lockExpiresAt" TIMESTAMPTZ(3),

    CONSTRAINT "poem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "line" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "poemId" UUID NOT NULL,
    "userId" UUID,
    "text" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "view" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "poemId" UUID NOT NULL,
    "userId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "view_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorite" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "poemId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "poem_completedAt_idx" ON "poem"("completedAt");

-- CreateIndex
CREATE INDEX "poem_lockedByUserId_idx" ON "poem"("lockedByUserId");

-- CreateIndex
CREATE INDEX "line_poemId_createdAt_idx" ON "line"("poemId", "createdAt");

-- CreateIndex
CREATE INDEX "line_userId_idx" ON "line"("userId");

-- CreateIndex
CREATE INDEX "view_poemId_idx" ON "view"("poemId");

-- CreateIndex
CREATE INDEX "view_userId_idx" ON "view"("userId");

-- CreateIndex
CREATE INDEX "favorite_poemId_idx" ON "favorite"("poemId");

-- CreateIndex
CREATE UNIQUE INDEX "favorite_userId_poemId_key" ON "favorite"("userId", "poemId");

-- AddForeignKey
ALTER TABLE "poem" ADD CONSTRAINT "poem_lockedByUserId_fkey" FOREIGN KEY ("lockedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "line" ADD CONSTRAINT "line_poemId_fkey" FOREIGN KEY ("poemId") REFERENCES "poem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "line" ADD CONSTRAINT "line_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "view" ADD CONSTRAINT "view_poemId_fkey" FOREIGN KEY ("poemId") REFERENCES "poem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "view" ADD CONSTRAINT "view_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite" ADD CONSTRAINT "favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite" ADD CONSTRAINT "favorite_poemId_fkey" FOREIGN KEY ("poemId") REFERENCES "poem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

