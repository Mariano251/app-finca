-- CreateEnum
CREATE TYPE "BaseDosis" AS ENUM ('HECTAREA', 'CALDO');

-- AlterTable
ALTER TABLE "AplicacionFitosanitaria" ADD COLUMN     "baseDosis" "BaseDosis";
