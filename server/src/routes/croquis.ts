import { Router } from "express";
import { imageSize } from "image-size";
import { prisma } from "../lib/prisma";
import { upload } from "../lib/upload";
import { subirImagen, borrarImagen } from "../lib/storage";

export const croquisRouter = Router();
export const poligonosRouter = Router();

const poligonosInclude = {
  poligonos: { include: { cuadro: { include: { campanas: { where: { estado: "ACTIVA" as const }, include: { cultivo: true } } } } } },
};

croquisRouter.get("/", async (req, res, next) => {
  try {
    const { fincaId } = req.query;
    const where: any = {};
    if (fincaId) where.fincaId = Number(fincaId);
    const items = await prisma.croquis.findMany({ where, include: poligonosInclude, orderBy: { id: "asc" } });
    res.json(items);
  } catch (e) {
    next(e);
  }
});

croquisRouter.get("/:id", async (req, res, next) => {
  try {
    const item = await prisma.croquis.findUnique({
      where: { id: Number(req.params.id) },
      include: poligonosInclude,
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

croquisRouter.post("/", async (req, res, next) => {
  try {
    const { fincaId, nombre } = req.body;
    const item = await prisma.croquis.create({
      data: { fincaId: Number(fincaId), nombre: nombre || null },
      include: poligonosInclude,
    });
    res.status(201).json(item);
  } catch (e) {
    next(e);
  }
});

croquisRouter.put("/:id", async (req, res, next) => {
  try {
    const { nombre } = req.body;
    const item = await prisma.croquis.update({
      where: { id: Number(req.params.id) },
      data: { nombre },
      include: poligonosInclude,
    });
    res.json(item);
  } catch (e) {
    next(e);
  }
});

croquisRouter.delete("/:id", async (req, res, next) => {
  try {
    await prisma.croquis.delete({ where: { id: Number(req.params.id) } });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

croquisRouter.post("/:id/imagen", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "Falta el archivo" });
      return;
    }
    const croquisId = Number(req.params.id);
    const existing = await prisma.croquis.findUnique({ where: { id: croquisId } });
    if (!existing) {
      res.status(404).json({ error: "No encontrado" });
      return;
    }

    let ancho: number | undefined;
    let alto: number | undefined;
    try {
      const dims = imageSize(req.file.buffer);
      ancho = dims.width;
      alto = dims.height;
    } catch {
      // dimension probing best-effort only
    }

    const url = await subirImagen(req.file.buffer, req.file.originalname, req.file.mimetype);

    if (existing.imagenPath) {
      await borrarImagen(existing.imagenPath).catch(() => {});
    }

    const item = await prisma.croquis.update({
      where: { id: croquisId },
      data: {
        imagenPath: url,
        imagenAncho: ancho ?? null,
        imagenAlto: alto ?? null,
      },
      include: poligonosInclude,
    });
    res.json(item);
  } catch (e) {
    next(e);
  }
});

croquisRouter.post("/:id/poligonos", async (req, res, next) => {
  try {
    const croquisId = Number(req.params.id);
    const { cuadroId, color, puntos, etiqueta } = req.body;
    const item = await prisma.croquisPoligono.create({
      data: {
        croquisId,
        cuadroId: cuadroId ? Number(cuadroId) : null,
        color: color || "#4a7c2c",
        puntos,
        etiqueta: etiqueta || null,
      },
    });
    res.status(201).json(item);
  } catch (e) {
    next(e);
  }
});

poligonosRouter.put("/:id", async (req, res, next) => {
  try {
    const { cuadroId, color, puntos, etiqueta } = req.body;
    const data: any = {};
    if (cuadroId !== undefined) data.cuadroId = cuadroId ? Number(cuadroId) : null;
    if (color !== undefined) data.color = color;
    if (puntos !== undefined) data.puntos = puntos;
    if (etiqueta !== undefined) data.etiqueta = etiqueta;
    const item = await prisma.croquisPoligono.update({
      where: { id: Number(req.params.id) },
      data,
    });
    res.json(item);
  } catch (e) {
    next(e);
  }
});

poligonosRouter.delete("/:id", async (req, res, next) => {
  try {
    await prisma.croquisPoligono.delete({ where: { id: Number(req.params.id) } });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});
