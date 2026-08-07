import type { CategoriaCosto, OrigenMovimiento, Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

interface CrearCostoAutomaticoInput {
  campanaId: number;
  insumoId: number;
  cantidad: number;
  fecha: Date;
  origen: OrigenMovimiento;
  origenId: number;
}

/**
 * Crea el Costo real derivado de un consumo de Insumo valorizado (monto = cantidad * costo
 * unitario promedio vigente). CategoriaInsumo y CategoriaCosto comparten los mismos nombres
 * (FITOSANITARIO/FERTILIZANTE/SEMILLA/OTRO) a proposito para que este mapeo sea directo.
 * origen/origenId quedan iguales a los del MovimientoStock que generó el consumo, así se puede
 * revertir con eliminarCostoAutomatico usando la misma clave.
 */
export async function crearCostoAutomatico(tx: Tx, input: CrearCostoAutomaticoInput) {
  const insumo = await tx.insumo.findUnique({ where: { id: input.insumoId } });
  if (!insumo) return null;

  return tx.costo.create({
    data: {
      campanaId: input.campanaId,
      categoria: insumo.categoria as unknown as CategoriaCosto,
      descripcion: `Consumo de ${insumo.nombre}`,
      monto: input.cantidad * (insumo.costoUnitario ?? 0),
      fecha: input.fecha,
      insumoId: insumo.id,
      origen: input.origen,
      origenId: input.origenId,
    },
  });
}

export async function eliminarCostoAutomatico(tx: Tx, origen: OrigenMovimiento, origenId: number) {
  await tx.costo.deleteMany({ where: { origen, origenId } });
}
