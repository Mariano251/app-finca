import { Router } from "express";
import { prisma } from "../lib/prisma";

export const conocimientoRouter = Router();

type Tipo = "enfermedad" | "plaga" | "maleza";

/** Distinct problem names (from Enfermedad/Plaga/Maleza) with occurrence counts, for a browsable index. */
conocimientoRouter.get("/problemas/lista", async (_req, res, next) => {
  try {
    const [enfermedades, plagas, malezas] = await Promise.all([
      prisma.enfermedad.groupBy({ by: ["nombre"], _count: { _all: true } }),
      prisma.plaga.groupBy({ by: ["nombre"], _count: { _all: true } }),
      prisma.maleza.groupBy({ by: ["especie"], _count: { _all: true } }),
    ]);

    const items = [
      ...enfermedades.map((e) => ({ tipo: "enfermedad" as Tipo, nombre: e.nombre, ocurrencias: e._count._all })),
      ...plagas.map((p) => ({ tipo: "plaga" as Tipo, nombre: p.nombre, ocurrencias: p._count._all })),
      ...malezas.map((m) => ({ tipo: "maleza" as Tipo, nombre: m.especie, ocurrencias: m._count._all })),
    ].sort((a, b) => b.ocurrencias - a.ocurrencias);

    res.json(items);
  } catch (e) {
    next(e);
  }
});

/** Distinct problem names affecting a given cultivo (spec #9: "what diseases affected potato"). */
conocimientoRouter.get("/por-cultivo", async (req, res, next) => {
  try {
    const cultivoId = Number(req.query.cultivoId);
    if (!cultivoId) {
      res.status(400).json({ error: "cultivoId es requerido" });
      return;
    }
    const [enfermedades, plagas, malezas] = await Promise.all([
      prisma.enfermedad.findMany({ where: { campana: { cultivoId } }, select: { nombre: true } }),
      prisma.plaga.findMany({ where: { campana: { cultivoId } }, select: { nombre: true } }),
      prisma.maleza.findMany({ where: { campana: { cultivoId } }, select: { especie: true } }),
    ]);
    res.json({
      enfermedades: Array.from(new Set(enfermedades.map((e) => e.nombre))),
      plagas: Array.from(new Set(plagas.map((p) => p.nombre))),
      malezas: Array.from(new Set(malezas.map((m) => m.especie))),
    });
  } catch (e) {
    next(e);
  }
});

const include = {
  campana: {
    include: {
      cultivo: true,
      cuadro: { include: { sector: { include: { finca: true } } } },
      cosechas: true,
      aplicaciones: true,
    },
  },
} as const;

/** Knowledge-base rollup for one problem: crops/cuadros/campanas affected, products used, outcomes. */
conocimientoRouter.get("/problemas", async (req, res, next) => {
  try {
    const tipo = String(req.query.tipo ?? "") as Tipo;
    const nombre = String(req.query.nombre ?? "");
    if (!tipo || !nombre) {
      res.status(400).json({ error: "tipo y nombre son requeridos" });
      return;
    }

    let registros: any[];
    if (tipo === "enfermedad") {
      registros = await prisma.enfermedad.findMany({ where: { nombre }, include });
    } else if (tipo === "plaga") {
      registros = await prisma.plaga.findMany({ where: { nombre }, include });
    } else if (tipo === "maleza") {
      registros = await prisma.maleza.findMany({ where: { especie: nombre }, include });
    } else {
      res.status(400).json({ error: "tipo inválido" });
      return;
    }

    const cultivosAfectados = Array.from(new Set(registros.map((r) => r.campana.cultivo.nombre)));
    const cuadrosAfectados = Array.from(
      new Map(registros.map((r) => [r.campana.cuadro.id, r.campana.cuadro.nombre])).entries()
    ).map(([id, nombre]) => ({ id, nombre }));
    const campanasAfectadas = Array.from(
      new Map(registros.map((r) => [r.campana.id, r.campana.nombre])).entries()
    ).map(([id, nombre]) => ({ id, nombre }));

    const campanaIds = Array.from(new Set(registros.map((r) => r.campanaId as number)));
    const productosUtilizados = Array.from(
      new Set(registros.flatMap((r) => r.campana.aplicaciones.map((a: any) => a.productoComercial)))
    );

    const niveles = registros
      .map((r) => r.nivelIncidencia ?? r.nivelPresencia ?? r.nivelInfestacion)
      .filter(Boolean);

    const resultados = registros.map((r) => {
      const cosechas = r.campana.cosechas as { rendimientoPorHa: number | null }[];
      const rendimientoPorHa =
        cosechas.length > 0
          ? cosechas.reduce((s, c) => s + (c.rendimientoPorHa ?? 0), 0) / cosechas.length
          : null;
      return {
        campanaId: r.campana.id,
        campanaNombre: r.campana.nombre,
        cuadro: r.campana.cuadro.nombre,
        anio: r.fecha ? new Date(r.fecha).getFullYear() : null,
        rendimientoPorHa,
      };
    });

    res.json({
      tipo,
      nombre,
      ocurrencias: registros.length,
      cultivosAfectados,
      cuadrosAfectados,
      campanasAfectadas,
      niveles,
      productosUtilizados,
      resultados,
      campanaIds,
    });
  } catch (e) {
    next(e);
  }
});
