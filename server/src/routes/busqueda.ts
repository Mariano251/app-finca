import { Router } from "express";
import { prisma } from "../lib/prisma";

export const busquedaRouter = Router();

/** Flexible fitosanitario search per spec #5/#9 ("what products did I use on garlic in 2025"). */
busquedaRouter.get("/buscar", async (req, res, next) => {
  try {
    const { cultivoId, cuadroId, anio, campanaId } = req.query;
    const where: any = {};
    if (campanaId) {
      where.campanaId = Number(campanaId);
    } else {
      const campanaWhere: any = {};
      if (cultivoId) campanaWhere.cultivoId = Number(cultivoId);
      if (cuadroId) campanaWhere.cuadroId = Number(cuadroId);
      if (anio) {
        campanaWhere.fechaPlantacion = {
          gte: new Date(`${anio}-01-01`),
          lt: new Date(`${Number(anio) + 1}-01-01`),
        };
      }
      if (Object.keys(campanaWhere).length > 0) where.campana = campanaWhere;
    }

    const items = await prisma.aplicacionFitosanitaria.findMany({
      where,
      include: { campana: { include: { cultivo: true, cuadro: true } } },
      orderBy: { fecha: "desc" },
    });
    res.json(items);
  } catch (e) {
    next(e);
  }
});
