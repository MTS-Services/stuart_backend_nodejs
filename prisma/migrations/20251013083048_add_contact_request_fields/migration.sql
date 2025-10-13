-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "message" TEXT,
ADD COLUMN     "requesterEmail" TEXT,
ADD COLUMN     "requesterName" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending';
