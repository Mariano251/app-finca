-- CreateEnum
CREATE TYPE "MetodoDistribucionCosto" AS ENUM ('POR_SUPERFICIE', 'POR_PORCENTAJE_COSTOS_DIRECTOS', 'POR_PRODUCCION', 'POR_VALOR_PRODUCCION', 'MANUAL');

-- AlterEnum
ALTER TYPE "OrigenMovimiento" ADD VALUE 'COMPRA';

-- AlterTable
ALTER TABLE "Costo" ADD COLUMN     "insumoId" INTEGER,
ADD COLUMN     "origen" "OrigenMovimiento",
ADD COLUMN     "origenId" INTEGER;

-- AlterTable
ALTER TABLE "Insumo" ADD COLUMN     "costoUnitario" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "CostoIndirecto" (
    "id" SERIAL NOT NULL,
    "fincaId" INTEGER,
    "categoria" TEXT NOT NULL,
    "descripcion" TEXT,
    "monto" DOUBLE PRECISION NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "metodoDistribucion" "MetodoDistribucionCosto" NOT NULL,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CostoIndirecto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostoIndirectoAsignacion" (
    "id" SERIAL NOT NULL,
    "costoIndirectoId" INTEGER NOT NULL,
    "campanaId" INTEGER NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CostoIndirectoAsignacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Presupuesto" (
    "id" SERIAL NOT NULL,
    "campanaId" INTEGER NOT NULL,
    "categoria" "CategoriaCosto",
    "montoPresupuestado" DOUBLE PRECISION NOT NULL,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Presupuesto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Compra" (
    "id" SERIAL NOT NULL,
    "insumoId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "precioUnitario" DOUBLE PRECISION NOT NULL,
    "montoTotal" DOUBLE PRECISION NOT NULL,
    "proveedor" TEXT,
    "factura" TEXT,
    "lote" TEXT,
    "vencimiento" TIMESTAMP(3),
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Compra_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CostoIndirecto_fincaId_idx" ON "CostoIndirecto"("fincaId");

-- CreateIndex
CREATE INDEX "CostoIndirecto_fecha_idx" ON "CostoIndirecto"("fecha");

-- CreateIndex
CREATE UNIQUE INDEX "CostoIndirectoAsignacion_costoIndirectoId_campanaId_key" ON "CostoIndirectoAsignacion"("costoIndirectoId", "campanaId");

-- CreateIndex
CREATE UNIQUE INDEX "Presupuesto_campanaId_categoria_key" ON "Presupuesto"("campanaId", "categoria");

-- CreateIndex
CREATE INDEX "Compra_insumoId_idx" ON "Compra"("insumoId");

-- CreateIndex
CREATE INDEX "Compra_fecha_idx" ON "Compra"("fecha");

-- CreateIndex
CREATE INDEX "Costo_origen_origenId_idx" ON "Costo"("origen", "origenId");

-- AddForeignKey
ALTER TABLE "Costo" ADD CONSTRAINT "Costo_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "Insumo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostoIndirecto" ADD CONSTRAINT "CostoIndirecto_fincaId_fkey" FOREIGN KEY ("fincaId") REFERENCES "Finca"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostoIndirectoAsignacion" ADD CONSTRAINT "CostoIndirectoAsignacion_costoIndirectoId_fkey" FOREIGN KEY ("costoIndirectoId") REFERENCES "CostoIndirecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostoIndirectoAsignacion" ADD CONSTRAINT "CostoIndirectoAsignacion_campanaId_fkey" FOREIGN KEY ("campanaId") REFERENCES "Campana"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presupuesto" ADD CONSTRAINT "Presupuesto_campanaId_fkey" FOREIGN KEY ("campanaId") REFERENCES "Campana"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Compra" ADD CONSTRAINT "Compra_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "Insumo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
