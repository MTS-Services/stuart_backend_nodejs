-- AlterTable
ALTER TABLE "email_templates" ADD COLUMN     "components" JSONB,
ADD COLUMN     "preheader" TEXT,
ADD COLUMN     "settings" JSONB,
ADD COLUMN     "variables" JSONB;
