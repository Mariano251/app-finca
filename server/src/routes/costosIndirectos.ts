import { Router } from "express";
import { prisma } from "../lib/prisma";
import { crudRouter } from "../lib/crudRouter";

function conFincaCoercida(data: any) {
  if (data.fincaId !== undefined) data.fincaId = data.fincaId ? Number(data.fincaId) : null;
  return data;
}

export const costosIndirectosRouter = crudRouter(prisma.costoIndirecto, {
  filterFields: ["fincaId"],
  intFilterFields: ["fincaId"],
  dateFields: ["fecha"],
  include: { asignaciones: true },
  orderBy: { fecha: "desc" },
  beforeCreate: conFincaCoercida,
  beforeUpdate: conFincaCoercida,
});

/**
 * Reemplaza el set completo de asignaciones manuales de un CostoIndirecto (solo relevante para
 * metodoDistribucion = MANUAL). Se manda la lista completa en vez de altas/bajas sueltas: es lo
 * que necesita el formulario (una tabla de campaña + monto) y evita estados intermedios raros.
 */
export const asignacionesRouter = Router({ mergeParams: true });

asignacionesRouter.get("/", async (req, res, next) => {
  try {
    const costoIndirectoId = Number((req.params as any).costoIndirectoId);
    const items = await prisma.costoIndirectoAsignacion.findMany({
      where: { costoIndirectoId },
      include: { campana: true },
    });
    res.json(items);
  } catch (e) {
    next(e);
  }
});

asignacionesRouter.put("/", async (req, res, next) => {
  try {
    const costoIndirectoId = Number((req.params as any).costoIndirectoId);
    const items: { campanaId: number; monto: number }[] = Array.isArray(req.body) ? req.body : [];

    const result = await prisma.$transaction(async (tx) => {
      await tx.costoIndirectoAsignacion.deleteMany({ where: { costoIndirectoId } });
      if (items.length > 0) {
        await tx.costoIndirectoAsignacion.createMany({
          data: items.map((i) => ({
            costoIndirectoId,
            campanaId: Number(i.campanaId),
            monto: Number(i.monto),
          })),
        });
      }
      return tx.costoIndirectoAsignacion.findMany({ where: { costoIndirectoId }, include: { campana: true } });
    });

    res.json(result);
  } catch (e) {
    next(e);
  }
});
