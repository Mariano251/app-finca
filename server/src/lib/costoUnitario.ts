import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

/**
 * Recalcula Insumo.costoUnitario como promedio ponderado desde cero, recorriendo todas sus
 * Compra ordenadas por fecha. Se recalcula desde el historial completo (en vez de ajustar
 * incrementalmente) para que quede correcto tambien despues de editar o borrar una compra vieja.
 */
export async function recalcularCostoUnitario(tx: Tx, insumoId: number) {
  const compras = await tx.compra.findMany({
    where: { insumoId },
    orderBy: { fecha: "asc" },
  });

  let stock = 0;
  let costoUnitario: number | null = null;

  for (const c of compras) {
    const stockNuevo = stock + c.cantidad;
    costoUnitario = stockNuevo > 0 ? (stock * (costoUnitario ?? 0) + c.cantidad * c.precioUnitario) / stockNuevo : c.precioUnitario;
    stock = stockNuevo;
  }

  await tx.insumo.update({
    where: { id: insumoId },
    data: { costoUnitario },
  });

  return costoUnitario;
}
