-- AlterTable
ALTER TABLE "Insumo" ADD COLUMN     "fincaId" INTEGER;

-- CreateIndex
CREATE INDEX "Insumo_fincaId_idx" ON "Insumo"("fincaId");

-- AddForeignKey
ALTER TABLE "Insumo" ADD CONSTRAINT "Insumo_fincaId_fkey" FOREIGN KEY ("fincaId") REFERENCES "Finca"("id") ON DELETE SET NULL ON UPDATE CASCADE;
