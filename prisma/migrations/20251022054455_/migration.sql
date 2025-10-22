/*
  Warnings:

  - You are about to drop the column `additionalPhotos` on the `profiles` table. All the data in the column will be lost.
  - You are about to drop the column `facePhoto` on the `profiles` table. All the data in the column will be lost.
  - You are about to drop the column `fullBodyPhoto` on the `profiles` table. All the data in the column will be lost.
  - You are about to drop the column `thirdPhoto` on the `profiles` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "profiles" DROP COLUMN "additionalPhotos",
DROP COLUMN "facePhoto",
DROP COLUMN "fullBodyPhoto",
DROP COLUMN "thirdPhoto",
ADD COLUMN     "image" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "age" DROP NOT NULL,
ALTER COLUMN "height" DROP NOT NULL,
ALTER COLUMN "bio" DROP NOT NULL,
ALTER COLUMN "location" DROP NOT NULL,
ALTER COLUMN "area" DROP NOT NULL,
ALTER COLUMN "bodyType" DROP NOT NULL,
ALTER COLUMN "displayName" DROP NOT NULL,
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "phone" DROP NOT NULL;
