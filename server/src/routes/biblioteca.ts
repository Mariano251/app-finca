import { Router } from "express";
import multer from "multer";
import { parse } from "csv-parse/sync";
import { prisma } from "../lib/prisma";
import { crudRouter } from "../lib/crudRouter";
import type { Prisma, TipoOrganismo } from "@prisma/client";

/**
 * Biblioteca de Productos y Principios Activos: catálogo de referencia técnica (qué existe, qué
 * controla qué), independiente de la bitácora real de campo (Plaga/Enfermedad/Maleza en
 * subregistros.ts, que registra lo que efectivamente pasó en una campaña). Se enlaza de forma
 * opcional a AplicacionFitosanitaria vía productoComercialLibId.
 */

const uploadCsv = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ---------------------------------------------------------------------------
// Organismos objetivo (plagas/ácaros/enfermedades/bacterias/malezas/nematodos)
// ---------------------------------------------------------------------------

export const organismosRouter = Router();

/** Búsqueda por nombre (contains, sin importar mayúsculas) y, opcionalmente, acotada a un cultivo
 *  concreto: un organismo es "relevante" para un cultivo si algún principio activo o producto que
 *  lo controla también está vinculado a ese cultivo (no hay relación directa Organismo<->Cultivo,
 *  se deriva de esas dos relaciones — ver punto 14 del pedido original: aprovechar las relaciones
 *  existentes en vez de duplicar datos). */
organismosRouter.get("/", async (req, res, next) => {
  try {
    const { tipo, q, cultivoId } = req.query as Record<string, string | undefined>;
    const where: Prisma.OrganismoWhereInput = {};
    if (tipo) where.tipo = tipo as TipoOrganismo;
    if (q) where.nombre = { contains: q, mode: "insensitive" };
    if (cultivoId) {
      const cid = Number(cultivoId);
      where.OR = [
        { principiosActivos: { some: { cultivos: { some: { id: cid } } } } },
        { productos: { some: { productoComercial: { cultivos: { some: { id: cid } } } } } },
      ];
    }
    const items = await prisma.organismo.findMany({ where, orderBy: { nombre: "asc" } });
    res.json(items);
  } catch (e) {
    next(e);
  }
});

organismosRouter.use(crudRouter(prisma.organismo, { filterFields: ["tipo"] }));

// ---------------------------------------------------------------------------
// Principios activos
// ---------------------------------------------------------------------------

const fichaPrincipioActivoInclude = {
  cultivos: true,
  organismos: true,
  productos: { include: { productoComercial: true } },
} as const;

export const principiosActivosRouter = Router();

/** Listado con "búsqueda combinada" (punto 4 del pedido): todos los filtros son opcionales y se
 *  combinan en AND, cubriendo cualquier flujo (por cultivo, por organismo, por grupo de acción,
 *  por movilidad, texto libre) sin necesitar un endpoint por combinación. */
principiosActivosRouter.get("/", async (req, res, next) => {
  try {
    const { tipo, q, cultivoId, organismoId, grupoAccion, movilidad, favorito, registroArgentina } =
      req.query as Record<string, string | undefined>;
    const where: Prisma.PrincipioActivoWhereInput = {};
    if (tipo) where.tipo = tipo as any;
    if (movilidad) where.movilidad = movilidad as any;
    if (registroArgentina) where.registroArgentina = registroArgentina as any;
    if (favorito !== undefined) where.favorito = favorito === "true";
    if (grupoAccion) where.grupoAccion = { contains: grupoAccion, mode: "insensitive" };
    if (q) where.nombre = { contains: q, mode: "insensitive" };
    if (cultivoId) where.cultivos = { some: { id: Number(cultivoId) } };
    if (organismoId) where.organismos = { some: { id: Number(organismoId) } };
    const items = await prisma.principioActivo.findMany({
      where,
      include: fichaPrincipioActivoInclude,
      orderBy: { nombre: "asc" },
    });
    res.json(items);
  } catch (e) {
    next(e);
  }
});

/** Ficha completa de varios principios activos a la vez, para el comparador (punto 7). */
principiosActivosRouter.get("/comparar", async (req, res, next) => {
  try {
    const ids = String(req.query.ids ?? "")
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
    const items = await prisma.principioActivo.findMany({
      where: { id: { in: ids } },
      include: fichaPrincipioActivoInclude,
    });
    const porId = new Map(items.map((i) => [i.id, i]));
    res.json(ids.map((id) => porId.get(id)).filter(Boolean));
  } catch (e) {
    next(e);
  }
});

principiosActivosRouter.use(
  crudRouter(prisma.principioActivo, {
    include: fichaPrincipioActivoInclude,
    orderBy: { nombre: "asc" },
    dateFields: ["fechaVerificacion"],
  })
);

// ---------------------------------------------------------------------------
// Productos comerciales
// ---------------------------------------------------------------------------

const fichaProductoInclude = {
  cultivos: true,
  principiosActivos: { include: { principioActivo: true } },
  organismos: { include: { organismo: true } },
} as const;

export const productosComercialesRouter = Router();

productosComercialesRouter.get("/", async (req, res, next) => {
  try {
    const {
      tipo,
      q,
      cultivoId,
      organismoId,
      principioActivoId,
      disponible,
      favorito,
      registroArgentina,
      recientes,
      cuadroId,
      limit,
    } = req.query as Record<string, string | undefined>;

    const where: Prisma.ProductoComercialWhereInput = {};
    if (tipo) where.tipo = tipo as any;
    if (disponible !== undefined) where.disponible = disponible === "true";
    if (favorito !== undefined) where.favorito = favorito === "true";
    if (registroArgentina) where.registroArgentina = registroArgentina as any;
    if (q) where.nombreComercial = { contains: q, mode: "insensitive" };
    if (cultivoId) where.cultivos = { some: { id: Number(cultivoId) } };
    if (organismoId) where.organismos = { some: { organismoId: Number(organismoId) } };
    if (principioActivoId) where.principiosActivos = { some: { principioActivoId: Number(principioActivoId) } };

    if (recientes === "true") {
      const recentesRows = await prisma.aplicacionFitosanitaria.findMany({
        where: {
          productoComercialLibId: { not: null },
          ...(cuadroId ? { campana: { cuadroId: Number(cuadroId) } } : {}),
        },
        orderBy: { fecha: "desc" },
        distinct: ["productoComercialLibId"],
        take: Number(limit) || 10,
        select: { productoComercialLibId: true },
      });
      const ids = recentesRows.map((r) => r.productoComercialLibId!).filter(Boolean);
      const productos = await prisma.productoComercial.findMany({
        where: { id: { in: ids }, ...where },
        include: fichaProductoInclude,
      });
      const orden = new Map(ids.map((id, i) => [id, i]));
      productos.sort((a, b) => (orden.get(a.id) ?? 0) - (orden.get(b.id) ?? 0));
      res.json(productos);
      return;
    }

    const items = await prisma.productoComercial.findMany({
      where,
      include: fichaProductoInclude,
      orderBy: { nombreComercial: "asc" },
    });
    res.json(items);
  } catch (e) {
    next(e);
  }
});

// ---------------------------------------------------------------------------
// Import / export CSV de productos comerciales (punto 15 del pedido: no cargar producto por
// producto). El import hace upsert por nombreComercial y crea por nombre (find-or-create) los
// Cultivo/Organismo/PrincipioActivo referenciados que todavía no existan.
//
// IMPORTANTE: /import y /export tienen que registrarse ANTES de montar crudRouter más abajo —
// crudRouter define GET /:id, y Express matchea rutas en orden de registro: si /:id se registra
// primero, "export"/"import" caen ahí como si fueran un id (bug real, encontrado en el smoke test
// de este mismo cambio) en vez de llegar a los handlers específicos.
// ---------------------------------------------------------------------------

const CSV_HEADERS = [
  "nombreComercial",
  "tipo",
  "formulacion",
  "movilidad",
  "disponible",
  "proveedor",
  "precio",
  "presentacion",
  "registroArgentina",
  "fuenteInformacion",
  "observaciones",
  "notasPersonales",
  "principiosActivos",
  "cultivos",
  "plagas",
  "acaros",
  "enfermedades",
  "bacterias",
  "malezas",
  "nematodos",
] as const;

function splitLista(v?: string): string[] {
  if (!v) return [];
  return v
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseEspecPrincipioActivo(spec: string) {
  const [nombre, concentracion, unidad] = spec.split(":").map((s) => s.trim());
  return { nombre, concentracion: concentracion ? Number(concentracion) : null, unidad: unidad || null };
}

function csvEscape(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function findOrCreateCultivo(tx: Prisma.TransactionClient, nombre: string) {
  const n = nombre.trim();
  if (!n) return null;
  return (await tx.cultivo.findUnique({ where: { nombre: n } })) ?? tx.cultivo.create({ data: { nombre: n } });
}

async function findOrCreateOrganismo(tx: Prisma.TransactionClient, tipo: TipoOrganismo, nombre: string) {
  const n = nombre.trim();
  if (!n) return null;
  return (
    (await tx.organismo.findUnique({ where: { tipo_nombre: { tipo, nombre: n } } })) ??
    tx.organismo.create({ data: { tipo, nombre: n } })
  );
}

async function findOrCreatePrincipioActivo(tx: Prisma.TransactionClient, nombre: string) {
  const n = nombre.trim();
  if (!n) return null;
  return (
    (await tx.principioActivo.findUnique({ where: { nombre: n } })) ??
    tx.principioActivo.create({ data: { nombre: n, tipo: "OTRO" } })
  );
}

async function importarFilaProducto(row: Record<string, string>) {
  const nombreComercial = (row.nombreComercial || "").trim();
  if (!nombreComercial) throw new Error("nombreComercial es obligatorio");
  const tipo = (row.tipo || "OTRO").trim().toUpperCase();

  return prisma.$transaction(async (tx) => {
    const cultivos = (await Promise.all(splitLista(row.cultivos).map((n) => findOrCreateCultivo(tx, n)))).filter(
      Boolean
    ) as { id: number }[];

    const organismosPorCampo: [string | undefined, TipoOrganismo][] = [
      [row.plagas, "PLAGA"],
      [row.acaros, "ACARO"],
      [row.enfermedades, "ENFERMEDAD"],
      [row.bacterias, "BACTERIA"],
      [row.malezas, "MALEZA"],
      [row.nematodos, "NEMATODO"],
    ];
    const organismos: { id: number }[] = [];
    for (const [campo, tipoOrg] of organismosPorCampo) {
      for (const nombre of splitLista(campo)) {
        const o = await findOrCreateOrganismo(tx, tipoOrg, nombre);
        if (o) organismos.push(o);
      }
    }

    const principios: { pa: { id: number }; concentracion: number | null; unidad: string | null }[] = [];
    for (const spec of splitLista(row.principiosActivos)) {
      const { nombre, concentracion, unidad } = parseEspecPrincipioActivo(spec);
      const pa = await findOrCreatePrincipioActivo(tx, nombre);
      if (pa) principios.push({ pa, concentracion, unidad });
    }

    const base = {
      nombreComercial,
      tipo: tipo as any,
      formulacion: row.formulacion || null,
      movilidad: (row.movilidad ? row.movilidad.trim().toUpperCase() : null) as any,
      disponible: row.disponible ? row.disponible.trim().toLowerCase() !== "false" : true,
      proveedor: row.proveedor || null,
      precio: row.precio ? Number(row.precio) : null,
      presentacion: row.presentacion || null,
      registroArgentina: (row.registroArgentina ? row.registroArgentina.trim().toUpperCase() : "PENDIENTE") as any,
      fuenteInformacion: row.fuenteInformacion || null,
      observaciones: row.observaciones || null,
      notasPersonales: row.notasPersonales || null,
    };

    const existing = await tx.productoComercial.findFirst({ where: { nombreComercial } });
    const principiosData = principios.map((r) => ({
      principioActivoId: r.pa.id,
      concentracion: r.concentracion,
      unidadConcentracion: r.unidad,
    }));
    const organismosData = organismos.map((o) => ({ organismoId: o.id }));

    if (existing) {
      return { producto: await tx.productoComercial.update({
        where: { id: existing.id },
        data: {
          ...base,
          cultivos: { set: cultivos.map((c) => ({ id: c.id })) },
          principiosActivos: { deleteMany: {}, create: principiosData },
          organismos: { deleteMany: {}, create: organismosData },
        },
      }), creado: false };
    }
    return { producto: await tx.productoComercial.create({
      data: {
        ...base,
        cultivos: { connect: cultivos.map((c) => ({ id: c.id })) },
        principiosActivos: { create: principiosData },
        organismos: { create: organismosData },
      },
    }), creado: true };
  });
}

productosComercialesRouter.post("/import", uploadCsv.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "Falta el archivo CSV" });
      return;
    }
    const texto = req.file.buffer.toString("utf-8");
    const filas: Record<string, string>[] = parse(texto, { columns: true, skip_empty_lines: true, trim: true });
    let creados = 0;
    let actualizados = 0;
    const errores: string[] = [];
    for (let i = 0; i < filas.length; i++) {
      try {
        const { creado } = await importarFilaProducto(filas[i]);
        if (creado) creados++;
        else actualizados++;
      } catch (e: any) {
        errores.push(`Fila ${i + 2}: ${e.message}`);
      }
    }
    res.json({ total: filas.length, creados, actualizados, errores });
  } catch (e) {
    next(e);
  }
});

productosComercialesRouter.get("/export", async (_req, res, next) => {
  try {
    const productos = await prisma.productoComercial.findMany({
      include: fichaProductoInclude,
      orderBy: { nombreComercial: "asc" },
    });
    const lineas = [CSV_HEADERS.join(",")];
    for (const p of productos) {
      const porTipo = (tipo: TipoOrganismo) =>
        p.organismos
          .filter((o) => o.organismo.tipo === tipo)
          .map((o) => o.organismo.nombre)
          .join("; ");
      const fila = [
        p.nombreComercial,
        p.tipo,
        p.formulacion ?? "",
        p.movilidad ?? "",
        String(p.disponible),
        p.proveedor ?? "",
        p.precio ?? "",
        p.presentacion ?? "",
        p.registroArgentina,
        p.fuenteInformacion ?? "",
        p.observaciones ?? "",
        p.notasPersonales ?? "",
        p.principiosActivos
          .map((r) => `${r.principioActivo.nombre}:${r.concentracion ?? ""}:${r.unidadConcentracion ?? ""}`)
          .join("; "),
        p.cultivos.map((c) => c.nombre).join("; "),
        porTipo("PLAGA"),
        porTipo("ACARO"),
        porTipo("ENFERMEDAD"),
        porTipo("BACTERIA"),
        porTipo("MALEZA"),
        porTipo("NEMATODO"),
      ];
      lineas.push(fila.map(csvEscape).join(","));
    }
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="productos-comerciales.csv"');
    res.send(lineas.join("\n"));
  } catch (e) {
    next(e);
  }
});

productosComercialesRouter.use(
  crudRouter(prisma.productoComercial, {
    include: fichaProductoInclude,
    orderBy: { nombreComercial: "asc" },
    dateFields: ["fechaVerificacion", "fechaActualizacionPrecio"],
  })
);

// ---------------------------------------------------------------------------
// Historial de uso por lote + alerta de rotación de grupos de acción (puntos 9 y 10)
// ---------------------------------------------------------------------------

export const bibliotecaExtraRouter = Router();

/** Principios activos / grupos de acción usados en un lote (cuadro) en la ventana reciente, con
 *  cantidad de aplicaciones y fecha de la última — para "qué se usó durante el ciclo" y para
 *  detectar repetición de grupo de acción. Informativo, no bloquea nada. */
bibliotecaExtraRouter.get("/historial", async (req, res, next) => {
  try {
    const cuadroId = Number(req.query.cuadroId);
    if (!cuadroId) {
      res.status(400).json({ error: "cuadroId es requerido" });
      return;
    }
    const dias = Number(req.query.dias) || 180;
    const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);

    const aplicaciones = await prisma.aplicacionFitosanitaria.findMany({
      where: { productoComercialLibId: { not: null }, fecha: { gte: desde }, campana: { cuadroId } },
      include: { productoComercialLib: { include: { principiosActivos: { include: { principioActivo: true } } } } },
      orderBy: { fecha: "desc" },
    });

    const porPrincipio = new Map<
      number,
      { principioActivoId: number; nombre: string; grupoAccion: string | null; cantidadAplicaciones: number; ultimaFecha: Date; productos: Set<string> }
    >();
    for (const ap of aplicaciones) {
      for (const rel of ap.productoComercialLib?.principiosActivos ?? []) {
        const pa = rel.principioActivo;
        const entry =
          porPrincipio.get(pa.id) ??
          { principioActivoId: pa.id, nombre: pa.nombre, grupoAccion: pa.grupoAccion, cantidadAplicaciones: 0, ultimaFecha: ap.fecha, productos: new Set<string>() };
        entry.cantidadAplicaciones += 1;
        entry.productos.add(ap.productoComercialLib!.nombreComercial);
        porPrincipio.set(pa.id, entry);
      }
    }

    const resultado = Array.from(porPrincipio.values())
      .map((e) => ({ ...e, productos: Array.from(e.productos) }))
      .sort((a, b) => b.ultimaFecha.getTime() - a.ultimaFecha.getTime());
    res.json(resultado);
  } catch (e) {
    next(e);
  }
});

/** Compara los grupos de acción del producto candidato contra el historial reciente de ese lote.
 *  Devuelve una alerta puramente informativa (punto 10) — nunca bloquea la carga. */
bibliotecaExtraRouter.get("/rotacion-check", async (req, res, next) => {
  try {
    const cuadroId = Number(req.query.cuadroId);
    const productoComercialId = Number(req.query.productoComercialId);
    if (!cuadroId || !productoComercialId) {
      res.status(400).json({ error: "cuadroId y productoComercialId son requeridos" });
      return;
    }
    const producto = await prisma.productoComercial.findUnique({
      where: { id: productoComercialId },
      include: { principiosActivos: { include: { principioActivo: true } } },
    });
    if (!producto) {
      res.status(404).json({ error: "Producto no encontrado" });
      return;
    }
    const gruposCandidato = Array.from(
      new Set(producto.principiosActivos.map((r) => r.principioActivo.grupoAccion).filter(Boolean) as string[])
    );
    if (gruposCandidato.length === 0) {
      res.json({ alerta: false, motivo: "Este producto no tiene grupo de acción cargado", grupos: [], coincidencias: [] });
      return;
    }

    const dias = Number(req.query.dias) || 30;
    const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
    const recientes = await prisma.aplicacionFitosanitaria.findMany({
      where: { campana: { cuadroId }, fecha: { gte: desde }, productoComercialLibId: { not: null } },
      include: { productoComercialLib: { include: { principiosActivos: { include: { principioActivo: true } } } } },
      orderBy: { fecha: "desc" },
    });

    const coincidencias: { fecha: Date; producto: string; grupoAccion: string }[] = [];
    for (const ap of recientes) {
      for (const rel of ap.productoComercialLib?.principiosActivos ?? []) {
        if (rel.principioActivo.grupoAccion && gruposCandidato.includes(rel.principioActivo.grupoAccion)) {
          coincidencias.push({ fecha: ap.fecha, producto: ap.productoComercialLib!.nombreComercial, grupoAccion: rel.principioActivo.grupoAccion });
        }
      }
    }

    res.json({ alerta: coincidencias.length > 0, grupos: gruposCandidato, coincidencias });
  } catch (e) {
    next(e);
  }
});
