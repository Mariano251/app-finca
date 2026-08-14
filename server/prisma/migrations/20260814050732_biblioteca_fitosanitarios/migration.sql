-- CreateEnum
CREATE TYPE "TipoOrganismo" AS ENUM ('PLAGA', 'ACARO', 'ENFERMEDAD', 'BACTERIA', 'MALEZA', 'NEMATODO');

-- CreateEnum
CREATE TYPE "Movilidad" AS ENUM ('CONTACTO', 'SISTEMICO', 'TRANSLAMINAR', 'ASCENDENTE', 'DESCENDENTE', 'OTRO');

-- CreateEnum
CREATE TYPE "RegistroArgentina" AS ENUM ('VERIFICADO', 'NO_VERIFICADO', 'NO_REGISTRADO', 'INTERNACIONAL', 'PENDIENTE');

-- CreateEnum
CREATE TYPE "EficaciaProducto" AS ENUM ('EFECTIVO', 'EFECTIVO_PARCIAL', 'NO_EFECTIVO', 'SIN_EXPERIENCIA');

-- AlterEnum
ALTER TYPE "TipoEntidadImagen" ADD VALUE 'PRODUCTO_COMERCIAL';

-- AlterEnum
ALTER TYPE "TipoFitosanitario" ADD VALUE 'BACTERICIDA';

-- AlterTable
ALTER TABLE "AplicacionFitosanitaria" ADD COLUMN     "productoComercialLibId" INTEGER;

-- CreateTable
CREATE TABLE "Organismo" (
    "id" SERIAL NOT NULL,
    "tipo" "TipoOrganismo" NOT NULL,
    "nombre" TEXT NOT NULL,
    "nombreCientifico" TEXT,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organismo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrincipioActivo" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoFitosanitario" NOT NULL,
    "grupoAccion" TEXT,
    "movilidad" "Movilidad",
    "observaciones" TEXT,
    "riesgoResistencia" TEXT,
    "recomendacionRotacion" TEXT,
    "registroArgentina" "RegistroArgentina" NOT NULL DEFAULT 'PENDIENTE',
    "fuenteInformacion" TEXT,
    "fechaVerificacion" TIMESTAMP(3),
    "favorito" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrincipioActivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductoComercial" (
    "id" SERIAL NOT NULL,
    "nombreComercial" TEXT NOT NULL,
    "tipo" "TipoFitosanitario" NOT NULL,
    "formulacion" TEXT,
    "movilidad" "Movilidad",
    "observaciones" TEXT,
    "disponible" BOOLEAN NOT NULL DEFAULT true,
    "proveedor" TEXT,
    "precio" DOUBLE PRECISION,
    "presentacion" TEXT,
    "fechaActualizacionPrecio" TIMESTAMP(3),
    "notasPersonales" TEXT,
    "registroArgentina" "RegistroArgentina" NOT NULL DEFAULT 'PENDIENTE',
    "fuenteInformacion" TEXT,
    "fechaVerificacion" TIMESTAMP(3),
    "favorito" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductoComercial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductoPrincipioActivo" (
    "id" SERIAL NOT NULL,
    "productoComercialId" INTEGER NOT NULL,
    "principioActivoId" INTEGER NOT NULL,
    "concentracion" DOUBLE PRECISION,
    "unidadConcentracion" TEXT,

    CONSTRAINT "ProductoPrincipioActivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductoOrganismo" (
    "id" SERIAL NOT NULL,
    "productoComercialId" INTEGER NOT NULL,
    "organismoId" INTEGER NOT NULL,
    "eficacia" "EficaciaProducto" NOT NULL DEFAULT 'SIN_EXPERIENCIA',
    "dosisRecomendada" DOUBLE PRECISION,
    "dosisMax" DOUBLE PRECISION,
    "unidadDosis" TEXT,
    "baseDosis" "BaseDosis",
    "notas" TEXT,

    CONSTRAINT "ProductoOrganismo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CultivoToPrincipioActivo" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_CultivoToPrincipioActivo_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_CultivoToProductoComercial" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_CultivoToProductoComercial_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_OrganismoToPrincipioActivo" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_OrganismoToPrincipioActivo_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "Organismo_tipo_idx" ON "Organismo"("tipo");

-- CreateIndex
CREATE UNIQUE INDEX "Organismo_tipo_nombre_key" ON "Organismo"("tipo", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "PrincipioActivo_nombre_key" ON "PrincipioActivo"("nombre");

-- CreateIndex
CREATE INDEX "PrincipioActivo_tipo_idx" ON "PrincipioActivo"("tipo");

-- CreateIndex
CREATE INDEX "PrincipioActivo_grupoAccion_idx" ON "PrincipioActivo"("grupoAccion");

-- CreateIndex
CREATE INDEX "ProductoComercial_tipo_idx" ON "ProductoComercial"("tipo");

-- CreateIndex
CREATE INDEX "ProductoPrincipioActivo_principioActivoId_idx" ON "ProductoPrincipioActivo"("principioActivoId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductoPrincipioActivo_productoComercialId_principioActivo_key" ON "ProductoPrincipioActivo"("productoComercialId", "principioActivoId");

-- CreateIndex
CREATE INDEX "ProductoOrganismo_organismoId_idx" ON "ProductoOrganismo"("organismoId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductoOrganismo_productoComercialId_organismoId_key" ON "ProductoOrganismo"("productoComercialId", "organismoId");

-- CreateIndex
CREATE INDEX "_CultivoToPrincipioActivo_B_index" ON "_CultivoToPrincipioActivo"("B");

-- CreateIndex
CREATE INDEX "_CultivoToProductoComercial_B_index" ON "_CultivoToProductoComercial"("B");

-- CreateIndex
CREATE INDEX "_OrganismoToPrincipioActivo_B_index" ON "_OrganismoToPrincipioActivo"("B");

-- CreateIndex
CREATE INDEX "AplicacionFitosanitaria_productoComercialLibId_idx" ON "AplicacionFitosanitaria"("productoComercialLibId");

-- AddForeignKey
ALTER TABLE "AplicacionFitosanitaria" ADD CONSTRAINT "AplicacionFitosanitaria_productoComercialLibId_fkey" FOREIGN KEY ("productoComercialLibId") REFERENCES "ProductoComercial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductoPrincipioActivo" ADD CONSTRAINT "ProductoPrincipioActivo_productoComercialId_fkey" FOREIGN KEY ("productoComercialId") REFERENCES "ProductoComercial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductoPrincipioActivo" ADD CONSTRAINT "ProductoPrincipioActivo_principioActivoId_fkey" FOREIGN KEY ("principioActivoId") REFERENCES "PrincipioActivo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductoOrganismo" ADD CONSTRAINT "ProductoOrganismo_productoComercialId_fkey" FOREIGN KEY ("productoComercialId") REFERENCES "ProductoComercial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductoOrganismo" ADD CONSTRAINT "ProductoOrganismo_organismoId_fkey" FOREIGN KEY ("organismoId") REFERENCES "Organismo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CultivoToPrincipioActivo" ADD CONSTRAINT "_CultivoToPrincipioActivo_A_fkey" FOREIGN KEY ("A") REFERENCES "Cultivo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CultivoToPrincipioActivo" ADD CONSTRAINT "_CultivoToPrincipioActivo_B_fkey" FOREIGN KEY ("B") REFERENCES "PrincipioActivo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CultivoToProductoComercial" ADD CONSTRAINT "_CultivoToProductoComercial_A_fkey" FOREIGN KEY ("A") REFERENCES "Cultivo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CultivoToProductoComercial" ADD CONSTRAINT "_CultivoToProductoComercial_B_fkey" FOREIGN KEY ("B") REFERENCES "ProductoComercial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OrganismoToPrincipioActivo" ADD CONSTRAINT "_OrganismoToPrincipioActivo_A_fkey" FOREIGN KEY ("A") REFERENCES "Organismo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OrganismoToPrincipioActivo" ADD CONSTRAINT "_OrganismoToPrincipioActivo_B_fkey" FOREIGN KEY ("B") REFERENCES "PrincipioActivo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
