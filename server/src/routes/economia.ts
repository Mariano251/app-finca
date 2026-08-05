import { Router } from "express";
import { prisma } from "../lib/prisma";
import { resumenCosechas } from "../lib/aggregates";

export const economiaRouter = Router();

/** Profitability ranking by cultivo or cuadro (spec #9: "most profitable crop / cuadro"). */
economiaRouter.get("/rentabilidad", async (req, res, next) => {
  try {
    const groupBy = req.query.groupBy === "cuadro" ? "cuadro" : "cultivo";
    const { desde, hasta } = req.query;

    const where: any = {};
    if (desde || hasta) {
      where.fechaPlantacion = {};
      if (desde) where.fechaPlantacion.gte = new Date(String(desde));
      if (hasta) where.fechaPlantacion.lte = new Date(String(hasta));
    }

    const campanas = await prisma.campana.findMany({
      where,
      include: {
        cultivo: true,
        cuadro: true,
        costos: true,
        ventas: true,
        cosechas: true,
      },
    });

    const groups = new Map<
      string,
      {
        id: number;
        nombre: string;
        superficieImplantada: number;
        costoTotal: number;
        ingresoTotal: number;
        produccionTotal: number;
        campanas: number;
      }
    >();

    for (const c of campanas) {
      const key = groupBy === "cuadro" ? `cuadro-${c.cuadroId}` : `cultivo-${c.cultivoId}`;
      const nombre = groupBy === "cuadro" ? c.cuadro.nombre : c.cultivo.nombre;
      const id = groupBy === "cuadro" ? c.cuadroId : c.cultivoId;
      const costoTotal = c.costos.reduce((s, x) => s + x.monto, 0);
      const ingresoTotal = c.ventas.reduce((s, x) => s + x.ingresoTotal, 0);
      const { produccionTotal } = resumenCosechas(c.cosechas);

      const existing = groups.get(key) ?? {
        id,
        nombre,
        superficieImplantada: 0,
        costoTotal: 0,
        ingresoTotal: 0,
        produccionTotal: 0,
        campanas: 0,
      };
      existing.superficieImplantada += c.superficieImplantada ?? 0;
      existing.costoTotal += costoTotal;
      existing.ingresoTotal += ingresoTotal;
      existing.produccionTotal += produccionTotal;
      existing.campanas += 1;
      groups.set(key, existing);
    }

    const ranking = Array.from(groups.values())
      .map((g) => {
        const margenBruto = g.ingresoTotal - g.costoTotal;
        return {
          ...g,
          margenBruto,
          costoPorHa: g.superficieImplantada > 0 ? g.costoTotal / g.superficieImplantada : null,
          resultadoPorHa: g.superficieImplantada > 0 ? margenBruto / g.superficieImplantada : null,
          costoPorKg: g.produccionTotal > 0 ? g.costoTotal / g.produccionTotal : null,
        };
      })
      .sort((a, b) => b.margenBruto - a.margenBruto);

    res.json({ groupBy, ranking });
  } catch (e) {
    next(e);
  }
});
