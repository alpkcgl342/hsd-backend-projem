-- CreateEnum
CREATE TYPE "TeamGroup" AS ENUM ('ELCI', 'ELCI_YARDIMCISI', 'KULUP_BASKANI');

-- DropForeignKey
ALTER TABLE "CommitteeMember" DROP CONSTRAINT "CommitteeMember_userId_fkey";

-- AlterTable
ALTER TABLE "BlogPost" ADD COLUMN     "coverImage" TEXT,
ADD COLUMN     "excerpt" TEXT;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "coverImage" TEXT;

-- AlterTable: Committee
-- slug NOT NULL olacak. Mevcut satirlarin bozulmamasi icin once nullable
-- eklenip ad alanindan uretiliyor, sonra NOT NULL yapiliyor.
ALTER TABLE "Committee" ADD COLUMN     "color" TEXT,
ADD COLUMN     "icon" TEXT,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "slug" TEXT;

UPDATE "Committee"
SET "slug" = regexp_replace(
      trim(both '-' from regexp_replace(
        lower(translate("name", 'çÇğĞıİöÖşŞüÜâÂîÎûÛ', 'ccggiioossuuaaiiuu')),
        '[^a-z0-9]+', '-', 'g'
      )),
      '-+', '-', 'g'
    ) || '-' || substr("id", 1, 6)
WHERE "slug" IS NULL;

ALTER TABLE "Committee" ALTER COLUMN "slug" SET NOT NULL;

-- AlterTable: CommitteeMember
-- fullName NOT NULL olacak; mevcut satirlar icin bagli kullanicinin adindan doldurulur.
ALTER TABLE "CommitteeMember" ADD COLUMN     "department" TEXT,
ADD COLUMN     "fullName" TEXT,
ADD COLUMN     "linkedinUrl" TEXT,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "userId" DROP NOT NULL;

UPDATE "CommitteeMember" cm
SET "fullName" = COALESCE(u."fullName", 'İsimsiz Üye')
FROM "User" u
WHERE cm."userId" = u."id" AND cm."fullName" IS NULL;

UPDATE "CommitteeMember" SET "fullName" = 'İsimsiz Üye' WHERE "fullName" IS NULL;

ALTER TABLE "CommitteeMember" ALTER COLUMN "fullName" SET NOT NULL;

-- CreateTable
CREATE TABLE "EventPhoto" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "group" "TeamGroup" NOT NULL,
    "subtitle" TEXT,
    "photoUrl" TEXT,
    "linkedinUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventPhoto_eventId_idx" ON "EventPhoto"("eventId");

-- CreateIndex
CREATE INDEX "TeamMember_group_order_idx" ON "TeamMember"("group", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Committee_slug_key" ON "Committee"("slug");

-- CreateIndex
CREATE INDEX "CommitteeMember_committeeId_idx" ON "CommitteeMember"("committeeId");

-- AddForeignKey
ALTER TABLE "EventPhoto" ADD CONSTRAINT "EventPhoto_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommitteeMember" ADD CONSTRAINT "CommitteeMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
