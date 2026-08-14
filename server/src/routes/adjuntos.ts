import { Router } from "express";
import { prisma } from "../lib/prisma";
import { uploadDoc } from "../lib/upload";
import { subirImagen } from "../lib/storage";

/**
 * Adjuntos de la Biblioteca (etiqueta/ficha técnica de un producto comercial, típicamente PDF).
 * Reutiliza el modelo `Imagen` (adjunto polimórfico por entityType/entityId) y su storage —
 * listado y borrado ya funcionan sin cambios vía /imagenes?entityType=&entityId= y /imagenes/:id.
 * Solo hace falta este endpoint de subida propio porque /imagenes usa un multer que sólo acepta
 * imágenes (ver server/src/lib/upload.ts).
 */
export const adjuntosRouter = Router();

adjuntosRouter.post("/", uploadDoc.single("file"), async (req, res, next) => {
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
    const adjunto = await prisma.imagen.create({
      data: {
        path: url,
        entityType,
        entityId: Number(entityId),
        descripcion: descripcion || req.file.originalname || null,
      },
    });
    res.status(201).json(adjunto);
  } catch (e) {
    next(e);
  }
});
