import { Router } from "express";
import { prisma } from "../lib/prisma";
import { crudRouter } from "../lib/crudRouter";
import { registrarMovimiento } from "../lib/stock";

function conFincaCoercida(data: any) {
  if (data.fincaId !== undefined) data.fincaId = data.fincaId ? Number(data.fincaId) : null;
  return data;
}

export const insumosRouter = Router();

/**
 * Lista propia (en vez de dejar que crudRouter arme el filtro de fincaId): un insumo "compartido"
 * (fincaId null — ej. el gasoil de dos fincas linderas que usan los mismos tractores) tiene que
 * aparecer al filtrar por cualquiera de esas fincas, no solo en "Todas las fincas". El filtro
 * genérico de crudRouter hace igualdad estricta y lo dejaría afuera.
 */
insumosRouter.get("/", async (req, res, next) => {
  try {
    const { categoria, activo, fincaId } = req.query as Record<string, string | undefined>;
    const where: Record<string, unknown> = {};
    if (categoria) where.categoria = categoria;
    if (activo !== undefined) where.activo = activo === "true";
    if (fincaId !== undefined) where.OR = [{ fincaId: Number(fincaId) }, { fincaId: null }];
    const items = await prisma.insumo.findMany({ where, include: { finca: true }, orderBy: { nombre: "asc" } });
    res.json(items);
  } catch (e) {
    next(e);
  }
});

insumosRouter.use(
  crudRouter(prisma.insumo, {
    filterFields: ["categoria", "activo", "fincaId"],
    boolFilterFields: ["activo"],
    intFilterFields: ["fincaId"],
    include: { finca: true },
    orderBy: { nombre: "asc" },
    beforeCreate: conFincaCoercida,
    beforeUpdate: conFincaCoercida,
  })
);

export const movimientosRouter = Router({ mergeParams: true });

movimientosRouter.get("/", async (req, res, next) => {
  try {
    const insumoId = Number((req.params as any).insumoId);
    const items = await prisma.movimientoStock.findMany({
      where: { insumoId },
      orderBy: { fecha: "desc" },
    });
    res.json(items);
  } catch (e) {
    next(e);
  }
});

movimientosRouter.post("/", async (req, res, next) => {
  try {
    const insumoId = Number((req.params as any).insumoId);
    const { tipo, cantidad, fecha, motivo, notas } = req.body;
    if (!tipo || !cantidad || !fecha) {
      res.status(400).json({ error: "tipo, cantidad y fecha son requeridos" });
      return;
    }
    const movimiento = await prisma.$transaction((tx) =>
      registrarMovimiento(tx, {
        insumoId,
        tipo,
        cantidad: Number(cantidad),
        fecha: new Date(fecha),
        origen: "MANUAL",
        motivo: motivo || null,
        notas: notas || null,
      })
    );
    res.status(201).json(movimiento);
  } catch (e) {
    next(e);
  }
});
