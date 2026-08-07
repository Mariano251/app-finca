import { Router } from "express";
import { prisma } from "../lib/prisma";
import { registrarMovimiento, revertirMovimientosDeOrigen } from "../lib/stock";
import { recalcularCostoUnitario } from "../lib/costoUnitario";

/**
 * Compra alimenta el stock (ENTRADA con origen=COMPRA) y la valorizacion del Insumo (promedio
 * ponderado, recalculado en recalcularCostoUnitario) en la misma transaccion. No usa crudRouter
 * generico porque necesita ese paso extra de recalculo en cada alta/edicion/baja.
 */

function montoTotal(cantidad: number, precioUnitario: number) {
  return cantidad * precioUnitario;
}

export const comprasNestedRouter = Router({ mergeParams: true });

comprasNestedRouter.get("/", async (req, res, next) => {
  try {
    const insumoId = Number((req.params as any).insumoId);
    const items = await prisma.compra.findMany({ where: { insumoId }, orderBy: { fecha: "desc" } });
    res.json(items);
  } catch (e) {
    next(e);
  }
});

comprasNestedRouter.post("/", async (req, res, next) => {
  try {
    const insumoId = Number((req.params as any).insumoId);
    const { fecha, cantidad, precioUnitario, proveedor, factura, lote, vencimiento, notas } = req.body;
    if (!fecha || !cantidad || precioUnitario == null) {
      res.status(400).json({ error: "fecha, cantidad y precioUnitario son requeridos" });
      return;
    }
    const cantidadNum = Number(cantidad);
    const precioNum = Number(precioUnitario);

    const compra = await prisma.$transaction(async (tx) => {
      const created = await tx.compra.create({
        data: {
          insumoId,
          fecha: new Date(fecha),
          cantidad: cantidadNum,
          precioUnitario: precioNum,
          montoTotal: montoTotal(cantidadNum, precioNum),
          proveedor: proveedor || null,
          factura: factura || null,
          lote: lote || null,
          vencimiento: vencimiento ? new Date(vencimiento) : null,
          notas: notas || null,
        },
      });
      await registrarMovimiento(tx, {
        insumoId,
        tipo: "ENTRADA",
        cantidad: cantidadNum,
        fecha: created.fecha,
        origen: "COMPRA",
        origenId: created.id,
        motivo: `Compra${proveedor ? ` a ${proveedor}` : ""}`,
      });
      await recalcularCostoUnitario(tx, insumoId);
      return created;
    });

    res.status(201).json(compra);
  } catch (e) {
    next(e);
  }
});

export const comprasStandaloneRouter = Router();

comprasStandaloneRouter.get("/:id", async (req, res, next) => {
  try {
    const item = await prisma.compra.findUnique({ where: { id: Number(req.params.id) } });
    if (!item) {
      res.status(404).json({ error: "No encontrado" });
      return;
    }
    res.json(item);
  } catch (e) {
    next(e);
  }
});

comprasStandaloneRouter.put("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { fecha, cantidad, precioUnitario, proveedor, factura, lote, vencimiento, notas } = req.body;
    const cantidadNum = Number(cantidad);
    const precioNum = Number(precioUnitario);

    const compra = await prisma.$transaction(async (tx) => {
      const existing = await tx.compra.findUniqueOrThrow({ where: { id } });
      await revertirMovimientosDeOrigen(tx, "COMPRA", id);
      const updated = await tx.compra.update({
        where: { id },
        data: {
          fecha: new Date(fecha),
          cantidad: cantidadNum,
          precioUnitario: precioNum,
          montoTotal: montoTotal(cantidadNum, precioNum),
          proveedor: proveedor || null,
          factura: factura || null,
          lote: lote || null,
          vencimiento: vencimiento ? new Date(vencimiento) : null,
          notas: notas || null,
        },
      });
      await registrarMovimiento(tx, {
        insumoId: existing.insumoId,
        tipo: "ENTRADA",
        cantidad: cantidadNum,
        fecha: updated.fecha,
        origen: "COMPRA",
        origenId: id,
        motivo: `Compra${proveedor ? ` a ${proveedor}` : ""}`,
      });
      await recalcularCostoUnitario(tx, existing.insumoId);
      return updated;
    });

    res.json(compra);
  } catch (e) {
    next(e);
  }
});

comprasStandaloneRouter.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await prisma.$transaction(async (tx) => {
      const existing = await tx.compra.findUniqueOrThrow({ where: { id } });
      await revertirMovimientosDeOrigen(tx, "COMPRA", id);
      await tx.compra.delete({ where: { id } });
      await recalcularCostoUnitario(tx, existing.insumoId);
    });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});
