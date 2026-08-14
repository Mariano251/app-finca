import { Router } from "express";
import { prisma } from "../lib/prisma";
import { obtenerClima } from "../lib/clima";

export const climaRouter = Router({ mergeParams: true });

climaRouter.get("/", async (req, res, next) => {
  try {
    const fincaId = Number((req.params as any).id);
    const finca = await prisma.finca.findUnique({ where: { id: fincaId } });
    if (!finca) {
      res.status(404).json({ error: "Finca no encontrada" });
      return;
    }
    if (finca.latitud == null || finca.longitud == null) {
      res.status(400).json({ error: "SIN_UBICACION" });
      return;
    }
    const clima = await obtenerClima(finca.latitud, finca.longitud);
    res.json(clima);
  } catch (e) {
    next(e);
  }
});
