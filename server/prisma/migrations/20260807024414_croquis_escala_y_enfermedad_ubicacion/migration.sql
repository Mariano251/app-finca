-- AlterTable
ALTER TABLE "Croquis" ADD COLUMN     "escalaDistanciaM" DOUBLE PRECISION,
ADD COLUMN     "escalaMetrosPorPixel" DOUBLE PRECISION,
ADD COLUMN     "escalaPuntoA" JSONB,
ADD COLUMN     "escalaPuntoB" JSONB;

-- AlterTable
ALTER TABLE "Enfermedad" ADD COLUMN     "croquisId" INTEGER,
ADD COLUMN     "croquisX" DOUBLE PRECISION,
ADD COLUMN     "croquisY" DOUBLE PRECISION,
ADD COLUMN     "radioMetros" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "Enfermedad_croquisId_idx" ON "Enfermedad"("croquisId");

-- AddForeignKey
ALTER TABLE "Enfermedad" ADD CONSTRAINT "Enfermedad_croquisId_fkey" FOREIGN KEY ("croquisId") REFERENCES "Croquis"("id") ON DELETE SET NULL ON UPDATE CASCADE;
