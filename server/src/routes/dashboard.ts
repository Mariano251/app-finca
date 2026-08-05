import { Router } from "express";
import { prisma } from "../lib/prisma";
import { resumenCosechas } from "../lib/aggregates";

export const dashboardRouter = Router();

const DIAS_PROXIMOS = 14;

dashboardRouter.get("/", async (_req, res, next) => {
  try {
    const hoy = new Date();
    const limite = new Date(hoy.getTime() + DIAS_PROXIMOS * 24 * 60 * 60 * 1000);

    const [cuadros, campanasActivas, todasCampanas, laboresPlanificadas, aplicacionesPlanificadas, enfermedades, plagas, malezas] =
      await Promise.all([
        prisma.cuadro.findMany({ select: { id: true, superficie: true, nombre: true } }),
        prisma.campana.findMany({
          where: { estado: "ACTIVA" },
          include: { cultivo: true, cuadro: true },
        }),
        prisma.campana.findMany({ include: { cosechas: true, costos: true, ventas: true } }),
        prisma.laborCultural.findMany({
          where: { estado: "PLANIFICADA" },
          include: { campana: { include: { cuadro: true, cultivo: true } } },
          orderBy: { fecha: "asc" },
        }),
        prisma.aplicacionFitosanitaria.findMany({
          where: { estado: "PLANIFICADA" },
          include: { campana: { include: { cuadro: true, cultivo: true } } },
          orderBy: { fecha: "asc" },
        }),
        prisma.enfermedad.findMany({
          include: { campana: { include: { cuadro: true, cultivo: true } } },
          orderBy: { fecha: "desc" },
          take: 200,
        }),
        prisma.plaga.findMany({
          include: { campana: { include: { cuadro: true, cultivo: true } } },
          orderBy: { fecha: "desc" },
          take: 200,
        }),
        prisma.maleza.findMany({
          include: { campana: { include: { cuadro: true, cultivo: true } } },
          orderBy: { fecha: "desc" },
          take: 200,
        }),
      ]);

    const superficieTotal = cuadros.reduce((s, c) => s + (c.superficie ?? 0), 0);

    const superficiePorCultivoMap = new Map<string, number>();
    for (const c of campanasActivas) {
      superficiePorCultivoMap.set(
        c.cultivo.nombre,
        (superficiePorCultivoMap.get(c.cultivo.nombre) ?? 0) + (c.superficieImplantada ?? 0)
      );
    }
    const superficiePorCultivo = Array.from(superficiePorCultivoMap.entries()).map(([cultivo, superficie]) => ({
      cultivo,
      superficie,
    }));

    const cultivosImplantados = Array.from(new Set(campanasActivas.map((c) => c.cultivo.nombre)));

    const produccionTotal = todasCampanas.reduce((s, c) => s + resumenCosechas(c.cosechas).produccionTotal, 0);
    const costoTotal = todasCampanas.reduce((s, c) => s + c.costos.reduce((s2, x) => s2 + x.monto, 0), 0);
    const ingresoTotal = todasCampanas.reduce((s, c) => s + c.ventas.reduce((s2, x) => s2 + x.ingresoTotal, 0), 0);

    const cosechasProximas = todasCampanas.filter(
      (c) =>
        c.estado !== "COSECHADA" &&
        c.estado !== "FINALIZADA" &&
        c.estado !== "CANCELADA" &&
        c.fechaCosechaEstimada &&
        c.cosechas.length === 0 &&
        new Date(c.fechaCosechaEstimada) <= limite
    );

    const problemasRecientes = [
      ...enfermedades.slice(0, 50).map((e) => ({ tipo: "enfermedad", nombre: e.nombre, fecha: e.fecha, cuadro: e.campana.cuadro.nombre, cuadroId: e.campana.cuadroId })),
      ...plagas.slice(0, 50).map((p) => ({ tipo: "plaga", nombre: p.nombre, fecha: p.fecha, cuadro: p.campana.cuadro.nombre, cuadroId: p.campana.cuadroId })),
      ...malezas.slice(0, 50).map((m) => ({ tipo: "maleza", nombre: m.especie, fecha: m.fecha, cuadro: m.campana.cuadro.nombre, cuadroId: m.campana.cuadroId })),
    ]
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .slice(0, 15);

    // cuadros con problemas recurrentes: same problem name appearing across >1 distinct campana on the same cuadro
    const recurrenteMap = new Map<string, { cuadroId: number; cuadro: string; nombre: string; campanaIds: Set<number> }>();
    for (const registro of [...enfermedades, ...plagas]) {
      const nombre = "nombre" in registro ? registro.nombre : "";
      const key = `${registro.campana.cuadroId}::${nombre}`;
      const entry = recurrenteMap.get(key) ?? {
        cuadroId: registro.campana.cuadroId,
        cuadro: registro.campana.cuadro.nombre,
        nombre,
        campanaIds: new Set<number>(),
      };
      entry.campanaIds.add(registro.campanaId);
      recurrenteMap.set(key, entry);
    }
    for (const m of malezas) {
      const key = `${m.campana.cuadroId}::${m.especie}`;
      const entry = recurrenteMap.get(key) ?? {
        cuadroId: m.campana.cuadroId,
        cuadro: m.campana.cuadro.nombre,
        nombre: m.especie,
        campanaIds: new Set<number>(),
      };
      entry.campanaIds.add(m.campanaId);
      recurrenteMap.set(key, entry);
    }
    const cuadrosConProblemasRecurrentes = Array.from(recurrenteMap.values())
      .filter((e) => e.campanaIds.size > 1)
      .map((e) => ({ cuadroId: e.cuadroId, cuadro: e.cuadro, nombre: e.nombre, campanas: e.campanaIds.size }));

    const tareasAtrasadas = [
      ...laboresPlanificadas
        .filter((l) => new Date(l.fecha) < hoy)
        .map((l) => ({ tipo: "labor" as const, id: l.id, descripcion: l.descripcion ?? l.tipo, fecha: l.fecha, cuadro: l.campana.cuadro.nombre })),
      ...aplicacionesPlanificadas
        .filter((a) => new Date(a.fecha) < hoy)
        .map((a) => ({ tipo: "aplicacion" as const, id: a.id, descripcion: a.productoComercial, fecha: a.fecha, cuadro: a.campana.cuadro.nombre })),
    ].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    const proximasLabores = laboresPlanificadas
      .filter((l) => new Date(l.fecha) >= hoy && new Date(l.fecha) <= limite)
      .map((l) => ({ id: l.id, tipo: l.tipo, descripcion: l.descripcion, fecha: l.fecha, cuadro: l.campana.cuadro.nombre, cuadroId: l.campana.cuadroId }));

    const aplicacionesPendientes = aplicacionesPlanificadas.map((a) => ({
      id: a.id,
      producto: a.productoComercial,
      fecha: a.fecha,
      cuadro: a.campana.cuadro.nombre,
      cuadroId: a.campana.cuadroId,
    }));

    res.json({
      superficieTotal,
      superficiePorCultivo,
      cultivosImplantados,
      campanasActivas: campanasActivas.map((c) => ({
        id: c.id,
        nombre: c.nombre,
        cultivo: c.cultivo.nombre,
        cuadro: c.cuadro.nombre,
        cuadroId: c.cuadroId,
      })),
      produccionTotal,
      costoTotal,
      ingresoTotal,
      rentabilidad: ingresoTotal - costoTotal,
      alertas: {
        aplicacionesPendientes,
        proximasLabores,
        cosechasProximas: cosechasProximas.map((c) => ({
          campanaId: c.id,
          campanaNombre: c.nombre,
          fechaCosechaEstimada: c.fechaCosechaEstimada,
        })),
        problemasRecientes,
        cuadrosConProblemasRecurrentes,
        tareasAtrasadas,
      },
    });
  } catch (e) {
    next(e);
  }
});
