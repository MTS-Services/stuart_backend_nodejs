/*
  Warnings:

  - You are about to drop the column `photos` on the `profiles` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "profiles" DROP COLUMN "photos",
ADD COLUMN     "additionalPhotos" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "thirdPhoto" TEXT;
