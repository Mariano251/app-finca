import { Router } from "express";
import { prisma } from "../lib/prisma";
import { anioDe, resumenCosechas } from "../lib/aggregates";

export const rendimientoRouter = Router();

/** Average yield per cuadro across all its campanas, for ranking best/worst performers (spec #9). */
rendimientoRouter.get("/por-cuadro", async (_req, res, next) => {
  try {
    const cuadros = await prisma.cuadro.findMany({
      include: {
        campanas: { include: { cosechas: true, cultivo: true } },
        sector: { include: { finca: true } },
      },
    });
    const items = cuadros
      .map((cuadro) => {
        const cosechas = cuadro.campanas.flatMap((c) => c.cosechas);
        const { rendimientoPorHa, produccionTotal } = resumenCosechas(cosechas);
        return {
          cuadroId: cuadro.id,
          cuadroNombre: cuadro.nombre,
          finca: cuadro.sector.finca.nombre,
          campanas: cuadro.campanas.length,
          rendimientoPromedioPorHa: rendimientoPorHa,
          produccionTotal,
        };
      })
      .filter((i) => i.rendimientoPromedioPorHa != null)
      .sort((a, b) => (a.rendimientoPromedioPorHa ?? 0) - (b.rendimientoPromedioPorHa ?? 0));
    res.json(items);
  } catch (e) {
    next(e);
  }
});

/** Cross-cuadro yield comparison for one cultivo across campanas (spec #9: "compare X across campaigns"). */
rendimientoRouter.get("/comparar", async (req, res, next) => {
  try {
    const { cultivoId } = req.query;
    if (!cultivoId) {
      res.status(400).json({ error: "cultivoId es requerido" });
      return;
    }
    const campanas = await prisma.campana.findMany({
      where: { cultivoId: Number(cultivoId) },
      include: { cuadro: { include: { sector: true } }, cosechas: true },
      orderBy: [{ fechaPlantacion: "asc" }],
    });
    const comparacion = campanas.map((c) => ({
      campanaId: c.id,
      campanaNombre: c.nombre,
      cuadro: c.cuadro.nombre,
      sector: c.cuadro.sector.nombre,
      anio: anioDe(c.fechaPlantacion),
      ...resumenCosechas(c.cosechas),
    }));
    res.json(comparacion);
  } catch (e) {
    next(e);
  }
});
