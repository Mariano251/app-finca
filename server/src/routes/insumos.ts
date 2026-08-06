import { Router } from "express";
import { prisma } from "../lib/prisma";
import { crudRouter } from "../lib/crudRouter";
import { registrarMovimiento } from "../lib/stock";

export const insumosRouter = crudRouter(prisma.insumo, {
  filterFields: ["categoria", "activo"],
  boolFilterFields: ["activo"],
  orderBy: { nombre: "asc" },
});

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
