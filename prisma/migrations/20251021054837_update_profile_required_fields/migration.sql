/*
  Warnings:

  - Made the column `age` on table `profiles` required. This step will fail if there are existing NULL values in that column.
  - Made the column `height` on table `profiles` required. This step will fail if there are existing NULL values in that column.
  - Made the column `bio` on table `profiles` required. This step will fail if there are existing NULL values in that column.
  - Made the column `location` on table `profiles` required. This step will fail if there are existing NULL values in that column.
  - Made the column `facePhoto` on table `profiles` required. This step will fail if there are existing NULL values in that column.
  - Made the column `fullBodyPhoto` on table `profiles` required. This step will fail if there are existing NULL values in that column.
  - Made the column `thirdPhoto` on table `profiles` required. This step will fail if there are existing NULL values in that column.
  - Made the column `area` on table `profiles` required. This step will fail if there are existing NULL values in that column.
  - Made the column `bodyType` on table `profiles` required. This step will fail if there are existing NULL values in that column.
  - Made the column `displayName` on table `profiles` required. This step will fail if there are existing NULL values in that column.
  - Made the column `email` on table `profiles` required. This step will fail if there are existing NULL values in that column.
  - Made the column `phone` on table `profiles` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "profiles" ALTER COLUMN "age" SET NOT NULL,
ALTER COLUMN "height" SET NOT NULL,
ALTER COLUMN "bio" SET NOT NULL,
ALTER COLUMN "location" SET NOT NULL,
ALTER COLUMN "facePhoto" SET NOT NULL,
ALTER COLUMN "fullBodyPhoto" SET NOT NULL,
ALTER COLUMN "thirdPhoto" SET NOT NULL,
ALTER COLUMN "area" SET NOT NULL,
ALTER COLUMN "bodyType" SET NOT NULL,
ALTER COLUMN "displayName" SET NOT NULL,
ALTER COLUMN "email" SET NOT NULL,
ALTER COLUMN "phone" SET NOT NULL;
