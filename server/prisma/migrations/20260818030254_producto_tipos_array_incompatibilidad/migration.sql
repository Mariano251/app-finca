-- AlterTable: ProductoComercial.tipo (single enum) -> tipos (array), preserving existing data.
ALTER TABLE "ProductoComercial" ADD COLUMN "tipos" "TipoFitosanitario"[] NOT NULL DEFAULT '{}';

UPDATE "ProductoComercial" SET "tipos" = ARRAY["tipo"] WHERE "tipo" IS NOT NULL;

ALTER TABLE "ProductoComercial" ALTER COLUMN "tipos" DROP DEFAULT;

DROP INDEX "ProductoComercial_tipo_idx";

ALTER TABLE "ProductoComercial" DROP COLUMN "tipo";

-- CreateIndex
CREATE INDEX "ProductoComercial_tipos_idx" ON "ProductoComercial" USING GIN ("tipos");

-- CreateTable
CREATE TABLE "Incompatibilidad" (
    "id" SERIAL NOT NULL,
    "principioActivoAId" INTEGER NOT NULL,
    "principioActivoBId" INTEGER NOT NULL,
    "tipo" TEXT,
    "fuente" TEXT,
    "observacion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incompatibilidad_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Incompatibilidad_principioActivoBId_idx" ON "Incompatibilidad"("principioActivoBId");

-- CreateIndex
CREATE UNIQUE INDEX "Incompatibilidad_principioActivoAId_principioActivoBId_key" ON "Incompatibilidad"("principioActivoAId", "principioActivoBId");

-- AddForeignKey
ALTER TABLE "Incompatibilidad" ADD CONSTRAINT "Incompatibilidad_principioActivoAId_fkey" FOREIGN KEY ("principioActivoAId") REFERENCES "PrincipioActivo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incompatibilidad" ADD CONSTRAINT "Incompatibilidad_principioActivoBId_fkey" FOREIGN KEY ("principioActivoBId") REFERENCES "PrincipioActivo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
