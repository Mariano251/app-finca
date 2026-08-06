-- CreateEnum
CREATE TYPE "SistemaRiego" AS ENUM ('GOTEO', 'ASPERSION', 'GRAVEDAD', 'PIVOTE', 'MICROASPERSION', 'SECANO', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoCampana" AS ENUM ('PLANIFICADA', 'ACTIVA', 'COSECHADA', 'FINALIZADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EstadoTarea" AS ENUM ('PLANIFICADA', 'REALIZADA');

-- CreateEnum
CREATE TYPE "TipoLabor" AS ENUM ('PREPARACION_SUELO', 'PLANTACION', 'FERTILIZACION', 'RIEGO', 'PODA', 'DESMALEZADO', 'APLICACION', 'COSECHA', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoFitosanitario" AS ENUM ('FUNGICIDA', 'INSECTICIDA', 'HERBICIDA', 'ACARICIDA', 'NEMATICIDA', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoEventoClimatico" AS ENUM ('HELADA', 'GRANIZO', 'VIENTO', 'ALTA_TEMPERATURA', 'LLUVIA', 'SEQUIA', 'OTRO');

-- CreateEnum
CREATE TYPE "NivelSeveridad" AS ENUM ('LEVE', 'MODERADA', 'SEVERA');

-- CreateEnum
CREATE TYPE "NivelInfestacion" AS ENUM ('BAJO', 'MEDIO', 'ALTO');

-- CreateEnum
CREATE TYPE "CategoriaCosto" AS ENUM ('SEMILLA', 'FERTILIZANTE', 'FITOSANITARIO', 'MANO_OBRA', 'MAQUINARIA', 'RIEGO', 'COMBUSTIBLE', 'COSECHA', 'FLETE', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoEntidadImagen" AS ENUM ('CAMPANA', 'LABOR', 'APLICACION', 'FERTILIZACION', 'RIEGO', 'MALEZA', 'ENFERMEDAD', 'PLAGA', 'EVENTO_CLIMATICO', 'COSECHA', 'CROQUIS', 'CUADRO');

-- CreateEnum
CREATE TYPE "CategoriaInsumo" AS ENUM ('FITOSANITARIO', 'FERTILIZANTE', 'SEMILLA', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoMovimientoStock" AS ENUM ('ENTRADA', 'SALIDA', 'AJUSTE');

-- CreateEnum
CREATE TYPE "OrigenMovimiento" AS ENUM ('MANUAL', 'APLICACION', 'FERTILIZACION', 'LABOR');

-- CreateTable
CREATE TABLE "Finca" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "ubicacion" TEXT,
    "superficieTotal" DOUBLE PRECISION,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Finca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sector" (
    "id" SERIAL NOT NULL,
    "fincaId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cuadro" (
    "id" SERIAL NOT NULL,
    "sectorId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "superficie" DOUBLE PRECISION,
    "ubicacion" TEXT,
    "tipoSuelo" TEXT,
    "caracteristicasSuelo" TEXT,
    "sistemaRiego" "SistemaRiego",
    "notas" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cuadro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cultivo" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "nombreCientifico" TEXT,
    "notas" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cultivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Variedad" (
    "id" SERIAL NOT NULL,
    "cultivoId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "notas" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Variedad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campana" (
    "id" SERIAL NOT NULL,
    "cuadroId" INTEGER NOT NULL,
    "cultivoId" INTEGER NOT NULL,
    "variedadId" INTEGER,
    "nombre" TEXT NOT NULL,
    "fechaPlantacion" TIMESTAMP(3),
    "fechaCosechaEstimada" TIMESTAMP(3),
    "fechaCosechaReal" TIMESTAMP(3),
    "estado" "EstadoCampana" NOT NULL DEFAULT 'PLANIFICADA',
    "superficieImplantada" DOUBLE PRECISION,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campana_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LaborCultural" (
    "id" SERIAL NOT NULL,
    "campanaId" INTEGER NOT NULL,
    "tipo" "TipoLabor" NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "descripcion" TEXT,
    "responsable" TEXT,
    "estado" "EstadoTarea" NOT NULL DEFAULT 'REALIZADA',
    "insumoId" INTEGER,
    "cantidadUtilizada" DOUBLE PRECISION,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LaborCultural_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AplicacionFitosanitaria" (
    "id" SERIAL NOT NULL,
    "campanaId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "productoComercial" TEXT NOT NULL,
    "principioActivo" TEXT,
    "tipo" "TipoFitosanitario" NOT NULL,
    "dosis" DOUBLE PRECISION,
    "unidadDosis" TEXT,
    "volumenCaldo" DOUBLE PRECISION,
    "superficieTratada" DOUBLE PRECISION,
    "problemaObjetivo" TEXT,
    "estadoCultivo" TEXT,
    "responsable" TEXT,
    "estado" "EstadoTarea" NOT NULL DEFAULT 'REALIZADA',
    "insumoId" INTEGER,
    "cantidadUtilizada" DOUBLE PRECISION,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AplicacionFitosanitaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fertilizacion" (
    "id" SERIAL NOT NULL,
    "campanaId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "producto" TEXT NOT NULL,
    "dosis" DOUBLE PRECISION,
    "unidadDosis" TEXT,
    "nUnidades" DOUBLE PRECISION,
    "pUnidades" DOUBLE PRECISION,
    "kUnidades" DOUBLE PRECISION,
    "otrosNutrientes" TEXT,
    "formaAplicacion" TEXT,
    "responsable" TEXT,
    "insumoId" INTEGER,
    "cantidadUtilizada" DOUBLE PRECISION,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fertilizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Riego" (
    "id" SERIAL NOT NULL,
    "campanaId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "duracionHoras" DOUBLE PRECISION,
    "volumenEstimado" DOUBLE PRECISION,
    "observaciones" TEXT,
    "responsable" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Riego_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fenologia" (
    "id" SERIAL NOT NULL,
    "campanaId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "estadoFenologico" TEXT NOT NULL,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fenologia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventoClimatico" (
    "id" SERIAL NOT NULL,
    "campanaId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "tipo" "TipoEventoClimatico" NOT NULL,
    "severidad" "NivelSeveridad",
    "descripcion" TEXT,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventoClimatico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Maleza" (
    "id" SERIAL NOT NULL,
    "campanaId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "especie" TEXT NOT NULL,
    "nivelInfestacion" "NivelInfestacion",
    "ubicacion" TEXT,
    "tratamientoRealizado" TEXT,
    "responsable" TEXT,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Maleza_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enfermedad" (
    "id" SERIAL NOT NULL,
    "campanaId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "nombre" TEXT NOT NULL,
    "nivelIncidencia" "NivelInfestacion",
    "sectorAfectado" TEXT,
    "diagnostico" TEXT,
    "tratamientoRealizado" TEXT,
    "responsable" TEXT,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Enfermedad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plaga" (
    "id" SERIAL NOT NULL,
    "campanaId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "nombre" TEXT NOT NULL,
    "nivelPresencia" "NivelInfestacion",
    "danosObservados" TEXT,
    "tratamientoRealizado" TEXT,
    "responsable" TEXT,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plaga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comentario" (
    "id" SERIAL NOT NULL,
    "campanaId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "texto" TEXT NOT NULL,
    "categoria" TEXT,
    "responsable" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comentario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cosecha" (
    "id" SERIAL NOT NULL,
    "campanaId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "superficieCosechada" DOUBLE PRECISION,
    "produccionTotal" DOUBLE PRECISION,
    "rendimientoPorHa" DOUBLE PRECISION,
    "calidad" TEXT,
    "descarte" DOUBLE PRECISION,
    "produccionComercial" DOUBLE PRECISION,
    "produccionNoComercial" DOUBLE PRECISION,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cosecha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Costo" (
    "id" SERIAL NOT NULL,
    "campanaId" INTEGER NOT NULL,
    "categoria" "CategoriaCosto" NOT NULL,
    "descripcion" TEXT,
    "monto" DOUBLE PRECISION NOT NULL,
    "fecha" TIMESTAMP(3),
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Costo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venta" (
    "id" SERIAL NOT NULL,
    "campanaId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "cantidadKg" DOUBLE PRECISION NOT NULL,
    "precioUnitario" DOUBLE PRECISION NOT NULL,
    "ingresoTotal" DOUBLE PRECISION NOT NULL,
    "comprador" TEXT,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Venta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Imagen" (
    "id" SERIAL NOT NULL,
    "path" TEXT NOT NULL,
    "entityType" "TipoEntidadImagen" NOT NULL,
    "entityId" INTEGER NOT NULL,
    "descripcion" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Imagen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Croquis" (
    "id" SERIAL NOT NULL,
    "fincaId" INTEGER NOT NULL,
    "imagenPath" TEXT,
    "imagenAncho" INTEGER,
    "imagenAlto" INTEGER,
    "nombre" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Croquis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CroquisPoligono" (
    "id" SERIAL NOT NULL,
    "croquisId" INTEGER NOT NULL,
    "cuadroId" INTEGER,
    "color" TEXT NOT NULL DEFAULT '#4a7c2c',
    "puntos" JSONB NOT NULL,
    "etiqueta" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CroquisPoligono_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Insumo" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" "CategoriaInsumo" NOT NULL,
    "unidad" TEXT NOT NULL,
    "stockActual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stockMinimo" DOUBLE PRECISION,
    "notas" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Insumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoStock" (
    "id" SERIAL NOT NULL,
    "insumoId" INTEGER NOT NULL,
    "tipo" "TipoMovimientoStock" NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "origen" "OrigenMovimiento" NOT NULL DEFAULT 'MANUAL',
    "origenId" INTEGER,
    "motivo" TEXT,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimientoStock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Sector_fincaId_idx" ON "Sector"("fincaId");

-- CreateIndex
CREATE INDEX "Cuadro_sectorId_idx" ON "Cuadro"("sectorId");

-- CreateIndex
CREATE UNIQUE INDEX "Cultivo_nombre_key" ON "Cultivo"("nombre");

-- CreateIndex
CREATE INDEX "Variedad_cultivoId_idx" ON "Variedad"("cultivoId");

-- CreateIndex
CREATE INDEX "Campana_cuadroId_idx" ON "Campana"("cuadroId");

-- CreateIndex
CREATE INDEX "Campana_cultivoId_idx" ON "Campana"("cultivoId");

-- CreateIndex
CREATE INDEX "LaborCultural_campanaId_idx" ON "LaborCultural"("campanaId");

-- CreateIndex
CREATE INDEX "LaborCultural_insumoId_idx" ON "LaborCultural"("insumoId");

-- CreateIndex
CREATE INDEX "AplicacionFitosanitaria_campanaId_idx" ON "AplicacionFitosanitaria"("campanaId");

-- CreateIndex
CREATE INDEX "AplicacionFitosanitaria_insumoId_idx" ON "AplicacionFitosanitaria"("insumoId");

-- CreateIndex
CREATE INDEX "Fertilizacion_campanaId_idx" ON "Fertilizacion"("campanaId");

-- CreateIndex
CREATE INDEX "Fertilizacion_insumoId_idx" ON "Fertilizacion"("insumoId");

-- CreateIndex
CREATE INDEX "Riego_campanaId_idx" ON "Riego"("campanaId");

-- CreateIndex
CREATE INDEX "Fenologia_campanaId_idx" ON "Fenologia"("campanaId");

-- CreateIndex
CREATE INDEX "EventoClimatico_campanaId_idx" ON "EventoClimatico"("campanaId");

-- CreateIndex
CREATE INDEX "Maleza_campanaId_idx" ON "Maleza"("campanaId");

-- CreateIndex
CREATE INDEX "Maleza_especie_idx" ON "Maleza"("especie");

-- CreateIndex
CREATE INDEX "Enfermedad_campanaId_idx" ON "Enfermedad"("campanaId");

-- CreateIndex
CREATE INDEX "Enfermedad_nombre_idx" ON "Enfermedad"("nombre");

-- CreateIndex
CREATE INDEX "Plaga_campanaId_idx" ON "Plaga"("campanaId");

-- CreateIndex
CREATE INDEX "Plaga_nombre_idx" ON "Plaga"("nombre");

-- CreateIndex
CREATE INDEX "Comentario_campanaId_idx" ON "Comentario"("campanaId");

-- CreateIndex
CREATE INDEX "Cosecha_campanaId_idx" ON "Cosecha"("campanaId");

-- CreateIndex
CREATE INDEX "Costo_campanaId_idx" ON "Costo"("campanaId");

-- CreateIndex
CREATE INDEX "Venta_campanaId_idx" ON "Venta"("campanaId");

-- CreateIndex
CREATE INDEX "Imagen_entityType_entityId_idx" ON "Imagen"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Croquis_fincaId_idx" ON "Croquis"("fincaId");

-- CreateIndex
CREATE INDEX "CroquisPoligono_croquisId_idx" ON "CroquisPoligono"("croquisId");

-- CreateIndex
CREATE INDEX "CroquisPoligono_cuadroId_idx" ON "CroquisPoligono"("cuadroId");

-- CreateIndex
CREATE INDEX "Insumo_categoria_idx" ON "Insumo"("categoria");

-- CreateIndex
CREATE INDEX "MovimientoStock_insumoId_idx" ON "MovimientoStock"("insumoId");

-- CreateIndex
CREATE INDEX "MovimientoStock_origen_origenId_idx" ON "MovimientoStock"("origen", "origenId");

-- AddForeignKey
ALTER TABLE "Sector" ADD CONSTRAINT "Sector_fincaId_fkey" FOREIGN KEY ("fincaId") REFERENCES "Finca"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cuadro" ADD CONSTRAINT "Cuadro_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Variedad" ADD CONSTRAINT "Variedad_cultivoId_fkey" FOREIGN KEY ("cultivoId") REFERENCES "Cultivo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campana" ADD CONSTRAINT "Campana_cuadroId_fkey" FOREIGN KEY ("cuadroId") REFERENCES "Cuadro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campana" ADD CONSTRAINT "Campana_cultivoId_fkey" FOREIGN KEY ("cultivoId") REFERENCES "Cultivo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campana" ADD CONSTRAINT "Campana_variedadId_fkey" FOREIGN KEY ("variedadId") REFERENCES "Variedad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaborCultural" ADD CONSTRAINT "LaborCultural_campanaId_fkey" FOREIGN KEY ("campanaId") REFERENCES "Campana"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaborCultural" ADD CONSTRAINT "LaborCultural_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "Insumo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AplicacionFitosanitaria" ADD CONSTRAINT "AplicacionFitosanitaria_campanaId_fkey" FOREIGN KEY ("campanaId") REFERENCES "Campana"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AplicacionFitosanitaria" ADD CONSTRAINT "AplicacionFitosanitaria_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "Insumo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fertilizacion" ADD CONSTRAINT "Fertilizacion_campanaId_fkey" FOREIGN KEY ("campanaId") REFERENCES "Campana"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fertilizacion" ADD CONSTRAINT "Fertilizacion_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "Insumo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Riego" ADD CONSTRAINT "Riego_campanaId_fkey" FOREIGN KEY ("campanaId") REFERENCES "Campana"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fenologia" ADD CONSTRAINT "Fenologia_campanaId_fkey" FOREIGN KEY ("campanaId") REFERENCES "Campana"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoClimatico" ADD CONSTRAINT "EventoClimatico_campanaId_fkey" FOREIGN KEY ("campanaId") REFERENCES "Campana"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Maleza" ADD CONSTRAINT "Maleza_campanaId_fkey" FOREIGN KEY ("campanaId") REFERENCES "Campana"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enfermedad" ADD CONSTRAINT "Enfermedad_campanaId_fkey" FOREIGN KEY ("campanaId") REFERENCES "Campana"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plaga" ADD CONSTRAINT "Plaga_campanaId_fkey" FOREIGN KEY ("campanaId") REFERENCES "Campana"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comentario" ADD CONSTRAINT "Comentario_campanaId_fkey" FOREIGN KEY ("campanaId") REFERENCES "Campana"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cosecha" ADD CONSTRAINT "Cosecha_campanaId_fkey" FOREIGN KEY ("campanaId") REFERENCES "Campana"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Costo" ADD CONSTRAINT "Costo_campanaId_fkey" FOREIGN KEY ("campanaId") REFERENCES "Campana"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_campanaId_fkey" FOREIGN KEY ("campanaId") REFERENCES "Campana"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Croquis" ADD CONSTRAINT "Croquis_fincaId_fkey" FOREIGN KEY ("fincaId") REFERENCES "Finca"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CroquisPoligono" ADD CONSTRAINT "CroquisPoligono_croquisId_fkey" FOREIGN KEY ("croquisId") REFERENCES "Croquis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CroquisPoligono" ADD CONSTRAINT "CroquisPoligono_cuadroId_fkey" FOREIGN KEY ("cuadroId") REFERENCES "Cuadro"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoStock" ADD CONSTRAINT "MovimientoStock_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "Insumo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
