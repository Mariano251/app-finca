import { Router } from "express";
import { prisma } from "../lib/prisma";
import { resumenCosechas } from "../lib/aggregates";
import { calcularAsignacion, type CampanaParaDistribucion } from "../lib/costosIndirectos";

export const economiaRouter = Router();

interface Metrica extends CampanaParaDistribucion {
  fincaId: number | null;
}

/** Trae campañas con sus totales directos (costo, ingreso, producción) y la finca a la que pertenecen. */
async function calcularMetricasCampanas(where: Record<string, unknown>) {
  const campanas = await prisma.campana.findMany({
    where,
    include: {
      cultivo: true,
      cuadro: { include: { sector: true } },
      costos: true,
      ventas: true,
      cosechas: true,
    },
  });

  const metricas: Metrica[] = campanas.map((c) => ({
    id: c.id,
    fincaId: c.cuadro.sector.fincaId,
    superficieImplantada: c.superficieImplantada ?? 0,
    costoDirecto: c.costos.reduce((s, x) => s + x.monto, 0),
    produccion: resumenCosechas(c.cosechas).produccionTotal,
    ingreso: c.ventas.reduce((s, x) => s + x.ingresoTotal, 0),
  }));

  return { campanas, metricas };
}

/**
 * Reparte cada CostoIndirecto que matchea `where` entre las campañas de `metricas` cuya finca
 * coincide (o todas, si el costo indirecto no tiene finca asignada), y devuelve el total
 * indirecto acumulado por campaña.
 */
async function distribuirIndirectos(metricas: Metrica[], where: Record<string, unknown>) {
  const costosIndirectos = await prisma.costoIndirecto.findMany({ where, include: { asignaciones: true } });
  const resultado = new Map<number, number>();

  for (const ci of costosIndirectos) {
    const aplicables = ci.fincaId == null ? metricas : metricas.filter((m) => m.fincaId === ci.fincaId);
    const asignacion = calcularAsignacion(
      aplicables,
      ci.monto,
      ci.metodoDistribucion,
      ci.asignaciones.map((a) => ({ campanaId: a.campanaId, monto: a.monto }))
    );
    for (const [campanaId, monto] of asignacion) {
      resultado.set(campanaId, (resultado.get(campanaId) ?? 0) + monto);
    }
  }

  return resultado;
}

/** Ranking de rentabilidad por cultivo o cuadro (spec #9), incluyendo costos directos + indirectos. */
economiaRouter.get("/rentabilidad", async (req, res, next) => {
  try {
    const groupBy = req.query.groupBy === "cuadro" ? "cuadro" : "cultivo";
    const { desde, hasta } = req.query;

    const where: any = {};
    const fechaFiltro: any = {};
    if (desde) fechaFiltro.gte = new Date(String(desde));
    if (hasta) fechaFiltro.lte = new Date(String(hasta));
    if (desde || hasta) where.fechaPlantacion = fechaFiltro;

    const { campanas, metricas } = await calcularMetricasCampanas(where);
    const indirectoWhere = desde || hasta ? { fecha: fechaFiltro } : {};
    const indirectoPorCampana = await distribuirIndirectos(metricas, indirectoWhere);

    const metricaPorId = new Map(metricas.map((m) => [m.id, m]));

    const groups = new Map<
      string,
      {
        id: number;
        nombre: string;
        superficieImplantada: number;
        costoDirecto: number;
        costoIndirecto: number;
        ingresoTotal: number;
        produccionTotal: number;
        campanas: number;
      }
    >();

    for (const c of campanas) {
      const key = groupBy === "cuadro" ? `cuadro-${c.cuadroId}` : `cultivo-${c.cultivoId}`;
      const nombre = groupBy === "cuadro" ? c.cuadro.nombre : c.cultivo.nombre;
      const id = groupBy === "cuadro" ? c.cuadroId : c.cultivoId;
      const metrica = metricaPorId.get(c.id)!;
      const costoIndirecto = indirectoPorCampana.get(c.id) ?? 0;

      const existing = groups.get(key) ?? {
        id,
        nombre,
        superficieImplantada: 0,
        costoDirecto: 0,
        costoIndirecto: 0,
        ingresoTotal: 0,
        produccionTotal: 0,
        campanas: 0,
      };
      existing.superficieImplantada += metrica.superficieImplantada;
      existing.costoDirecto += metrica.costoDirecto;
      existing.costoIndirecto += costoIndirecto;
      existing.ingresoTotal += metrica.ingreso;
      existing.produccionTotal += metrica.produccion;
      existing.campanas += 1;
      groups.set(key, existing);
    }

    const ranking = Array.from(groups.values())
      .map((g) => {
        const costoTotal = g.costoDirecto + g.costoIndirecto;
        const margenBruto = g.ingresoTotal - costoTotal;
        return {
          ...g,
          costoTotal,
          margenBruto,
          costoPorHa: g.superficieImplantada > 0 ? costoTotal / g.superficieImplantada : null,
          resultadoPorHa: g.superficieImplantada > 0 ? margenBruto / g.superficieImplantada : null,
          costoPorKg: g.produccionTotal > 0 ? costoTotal / g.produccionTotal : null,
        };
      })
      .sort((a, b) => b.margenBruto - a.margenBruto);

    res.json({ groupBy, ranking });
  } catch (e) {
    next(e);
  }
});

/** Presupuesto vs real por campaña (spec #16), por categoría de costo directo + una fila "Total". */
economiaRouter.get("/presupuesto", async (req, res, next) => {
  try {
    const campanaId = Number(req.query.campanaId);
    if (!campanaId) {
      res.status(400).json({ error: "campanaId es requerido" });
      return;
    }

    const [presupuestos, costosDirectos, { metricas }] = await Promise.all([
      prisma.presupuesto.findMany({ where: { campanaId } }),
      prisma.costo.findMany({ where: { campanaId } }),
      calcularMetricasCampanas({}),
    ]);

    const indirectoPorCampana = await distribuirIndirectos(metricas, {});
    const indirectoDeEstaCampana = indirectoPorCampana.get(campanaId) ?? 0;

    const realPorCategoria = new Map<string, number>();
    for (const c of costosDirectos) {
      realPorCategoria.set(c.categoria, (realPorCategoria.get(c.categoria) ?? 0) + c.monto);
    }
    const realTotal = costosDirectos.reduce((s, c) => s + c.monto, 0) + indirectoDeEstaCampana;

    const filas = presupuestos
      .map((p) => {
        const real = p.categoria == null ? realTotal : realPorCategoria.get(p.categoria) ?? 0;
        return {
          id: p.id,
          categoria: p.categoria,
          presupuestado: p.montoPresupuestado,
          real,
          diferencia: p.montoPresupuestado - real,
        };
      })
      .sort((a, b) => (a.categoria == null ? 1 : b.categoria == null ? -1 : a.categoria.localeCompare(b.categoria)));

    res.json({ campanaId, filas });
  } catch (e) {
    next(e);
  }
});
