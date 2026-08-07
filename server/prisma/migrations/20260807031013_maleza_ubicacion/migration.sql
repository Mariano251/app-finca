-- AlterTable
ALTER TABLE "Maleza" ADD COLUMN     "croquisId" INTEGER,
ADD COLUMN     "croquisX" DOUBLE PRECISION,
ADD COLUMN     "croquisY" DOUBLE PRECISION,
ADD COLUMN     "radioMetros" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "Maleza_croquisId_idx" ON "Maleza"("croquisId");

-- AddForeignKey
ALTER TABLE "Maleza" ADD CONSTRAINT "Maleza_croquisId_fkey" FOREIGN KEY ("croquisId") REFERENCES "Croquis"("id") ON DELETE SET NULL ON UPDATE CASCADE;
