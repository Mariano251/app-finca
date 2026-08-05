import { Router } from "express";
import { prisma } from "../lib/prisma";
import { anioDe, resumenCosechas } from "../lib/aggregates";

export const cuadrosRouter = Router();

const include = {
  sector: { include: { finca: true } },
  campanas: {
    where: { estado: "ACTIVA" as const },
    include: { cultivo: true, variedad: true },
  },
};

cuadrosRouter.get("/", async (req, res, next) => {
  try {
    const { sectorId, fincaId, activo } = req.query;
    const where: any = {};
    if (sectorId) where.sectorId = Number(sectorId);
    if (fincaId) where.sector = { fincaId: Number(fincaId) };
    if (activo !== undefined) where.activo = activo === "true";
    const items = await prisma.cuadro.findMany({ where, include, orderBy: { nombre: "asc" } });
    res.json(items);
  } catch (e) {
    next(e);
  }
});

cuadrosRouter.get("/:id", async (req, res, next) => {
  try {
    const item = await prisma.cuadro.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        sector: { include: { finca: true } },
        campanas: {
          include: { cultivo: true, variedad: true },
          orderBy: { fechaPlantacion: "desc" },
        },
      },
    });
    if (!item) {
      res.status(404).json({ error: "No encontrado" });
      return;
    }
    res.json(item);
  } catch (e) {
    next(e);
  }
});

cuadrosRouter.get("/:id/rendimiento-historico", async (req, res, next) => {
  try {
    const cuadroId = Number(req.params.id);
    const campanas = await prisma.campana.findMany({
      where: { cuadroId },
      include: { cultivo: true, variedad: true, cosechas: true },
      orderBy: { fechaPlantacion: "asc" },
    });
    const historico = campanas.map((c) => ({
      campanaId: c.id,
      campanaNombre: c.nombre,
      cultivo: c.cultivo.nombre,
      variedad: c.variedad?.nombre ?? null,
      anio: anioDe(c.fechaPlantacion),
      estado: c.estado,
      ...resumenCosechas(c.cosechas),
    }));
    res.json(historico);
  } catch (e) {
    next(e);
  }
});

cuadrosRouter.get("/:id/problemas", async (req, res, next) => {
  try {
    const cuadroId = Number(req.params.id);
    const [enfermedades, plagas, malezas] = await Promise.all([
      prisma.enfermedad.findMany({
        where: { campana: { cuadroId } },
        include: { campana: { select: { nombre: true, fechaPlantacion: true } } },
        orderBy: { fecha: "desc" },
      }),
      prisma.plaga.findMany({
        where: { campana: { cuadroId } },
        include: { campana: { select: { nombre: true, fechaPlantacion: true } } },
        orderBy: { fecha: "desc" },
      }),
      prisma.maleza.findMany({
        where: { campana: { cuadroId } },
        include: { campana: { select: { nombre: true, fechaPlantacion: true } } },
        orderBy: { fecha: "desc" },
      }),
    ]);
    res.json({ enfermedades, plagas, malezas });
  } catch (e) {
    next(e);
  }
});

cuadrosRouter.post("/", async (req, res, next) => {
  try {
    const item = await prisma.cuadro.create({ data: req.body, include });
    res.status(201).json(item);
  } catch (e) {
    next(e);
  }
});

cuadrosRouter.put("/:id", async (req, res, next) => {
  try {
    const item = await prisma.cuadro.update({
      where: { id: Number(req.params.id) },
      data: req.body,
      include,
    });
    res.json(item);
  } catch (e) {
    next(e);
  }
});

cuadrosRouter.delete("/:id", async (req, res, next) => {
  try {
    await prisma.cuadro.delete({ where: { id: Number(req.params.id) } });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});
