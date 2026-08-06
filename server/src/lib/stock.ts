import type { Prisma, OrigenMovimiento, TipoMovimientoStock } from "@prisma/client";

type Tx = Prisma.TransactionClient;

interface RegistrarMovimientoInput {
  insumoId: number;
  tipo: TipoMovimientoStock;
  cantidad: number;
  fecha: Date;
  origen?: OrigenMovimiento;
  origenId?: number | null;
  motivo?: string | null;
  notas?: string | null;
}

/** Creates a stock movement row and adjusts Insumo.stockActual accordingly, atomically. */
export async function registrarMovimiento(tx: Tx, input: RegistrarMovimientoInput) {
  const delta = input.tipo === "SALIDA" ? -Math.abs(input.cantidad) : Math.abs(input.cantidad);

  const movimiento = await tx.movimientoStock.create({
    data: {
      insumoId: input.insumoId,
      tipo: input.tipo,
      cantidad: Math.abs(input.cantidad),
      fecha: input.fecha,
      origen: input.origen ?? "MANUAL",
      origenId: input.origenId ?? null,
      motivo: input.motivo ?? null,
      notas: input.notas ?? null,
    },
  });

  await tx.insumo.update({
    where: { id: input.insumoId },
    data: { stockActual: { increment: delta } },
  });

  return movimiento;
}

/**
 * Finds every movement tied to a given (origen, origenId) pair, reverses its effect on
 * Insumo.stockActual, and deletes it. Used before re-registering a movement on update, and when
 * the record that originated it (an AplicacionFitosanitaria, Fertilizacion, LaborCultural) is
 * deleted — keeps the stock ledger consistent without having to diff old vs new values.
 */
export async function revertirMovimientosDeOrigen(tx: Tx, origen: OrigenMovimiento, origenId: number) {
  const movimientos = await tx.movimientoStock.findMany({ where: { origen, origenId } });
  for (const m of movimientos) {
    const delta = m.tipo === "SALIDA" ? Math.abs(m.cantidad) : -Math.abs(m.cantidad);
    await tx.insumo.update({
      where: { id: m.insumoId },
      data: { stockActual: { increment: delta } },
    });
  }
  if (movimientos.length > 0) {
    await tx.movimientoStock.deleteMany({ where: { origen, origenId } });
  }
}
