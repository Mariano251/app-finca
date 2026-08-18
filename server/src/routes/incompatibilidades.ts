import { Router } from "express";
import { prisma } from "../lib/prisma";
import { crudRouter } from "../lib/crudRouter";
import type { Prisma } from "@prisma/client";

/**
 * Incompatibilidades documentadas entre dos principios activos (punto 32 del pedido: "Biblioteca
 * de Productos y Principios Activos"). Es un dato de fuente, no una regla inventada: la ausencia
 * de una fila acá nunca debe mostrarse como "compatible", solo como "no documentado" — ver
 * `ChequeoMezcla.tsx` en el cliente.
 *
 * Convención de la app (no de la base): siempre se guarda con principioActivoAId < principioActivoBId
 * para que el mismo par no pueda cargarse duplicado al revés; las consultas siempre miran ambos lados.
 */

const include = {
  principioActivoA: true,
  principioActivoB: true,
} as const;

export const incompatibilidadesRouter = Router();

function ordenarPar(a: number, b: number): [number, number] {
  return a < b ? [a, b] : [b, a];
}

/** Todas las incompatibilidades que involucran a un principio activo (para la ficha), o todas si
 *  no se pasa `principioActivoId`. */
incompatibilidadesRouter.get("/", async (req, res, next) => {
  try {
    const { principioActivoId } = req.query as Record<string, string | undefined>;
    const where: Prisma.IncompatibilidadWhereInput = {};
    if (principioActivoId) {
      const id = Number(principioActivoId);
      where.OR = [{ principioActivoAId: id }, { principioActivoBId: id }];
    }
    const items = await prisma.incompatibilidad.findMany({ where, include });
    res.json(items);
  } catch (e) {
    next(e);
  }
});

/** Para el "Chequeo de mezcla": dado un conjunto de ids, devuelve los pares documentados entre
 *  ellos (nunca afirma "compatible" para los que no aparecen — eso lo decide el cliente). */
incompatibilidadesRouter.get("/check", async (req, res, next) => {
  try {
    const ids = String(req.query.ids ?? "")
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (ids.length < 2) {
      res.json([]);
      return;
    }
    const items = await prisma.incompatibilidad.findMany({
      where: { principioActivoAId: { in: ids }, principioActivoBId: { in: ids } },
      include,
    });
    res.json(items);
  } catch (e) {
    next(e);
  }
});

incompatibilidadesRouter.use(
  crudRouter(prisma.incompatibilidad, {
    include,
    beforeCreate: (body) => {
      const [principioActivoAId, principioActivoBId] = ordenarPar(
        Number(body.principioActivoAId),
        Number(body.principioActivoBId)
      );
      if (principioActivoAId === principioActivoBId) {
        throw new Error("No se puede documentar una incompatibilidad de un principio activo consigo mismo");
      }
      return { ...body, principioActivoAId, principioActivoBId };
    },
  })
);
