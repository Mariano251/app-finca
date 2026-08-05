import { Router } from "express";
import { prisma } from "../lib/prisma";
import { upload } from "../lib/upload";
import { subirImagen, borrarImagen } from "../lib/storage";

export const imagenesRouter = Router();

imagenesRouter.get("/", async (req, res, next) => {
  try {
    const { entityType, entityId } = req.query;
    const where: any = {};
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = Number(entityId);
    const items = await prisma.imagen.findMany({ where, orderBy: { fecha: "desc" } });
    res.json(items);
  } catch (e) {
    next(e);
  }
});

imagenesRouter.post("/", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "Falta el archivo" });
      return;
    }
    const { entityType, entityId, descripcion } = req.body;
    if (!entityType || !entityId) {
      res.status(400).json({ error: "entityType y entityId son requeridos" });
      return;
    }
    const url = await subirImagen(req.file.buffer, req.file.originalname, req.file.mimetype);
    const imagen = await prisma.imagen.create({
      data: {
        path: url,
        entityType,
        entityId: Number(entityId),
        descripcion: descripcion || null,
      },
    });
    res.status(201).json(imagen);
  } catch (e) {
    next(e);
  }
});

imagenesRouter.delete("/:id", async (req, res, next) => {
  try {
    const imagen = await prisma.imagen.findUnique({ where: { id: Number(req.params.id) } });
    if (!imagen) {
      res.status(404).json({ error: "No encontrado" });
      return;
    }
    await prisma.imagen.delete({ where: { id: imagen.id } });
    await borrarImagen(imagen.path).catch(() => {});
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});
