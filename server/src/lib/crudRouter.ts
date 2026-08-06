import { Router, type RequestHandler } from "express";
import type { Prisma, OrigenMovimiento } from "@prisma/client";
import { prisma } from "./prisma";
import { registrarMovimiento, revertirMovimientosDeOrigen } from "./stock";

interface StockLinkOptions {
  /** Which OrigenMovimiento this resource writes when it deducts stock. */
  origen: OrigenMovimiento;
  /** Returns the model delegate bound to the current transaction, e.g. (tx) => tx.laborCultural. */
  getTxDelegate: (tx: Prisma.TransactionClient) => any;
  /** Field on the record holding the chosen Insumo id. Defaults to "insumoId". */
  insumoIdField?: string;
  /** Field on the record holding the quantity consumed. Defaults to "cantidadUtilizada". */
  cantidadField?: string;
  /** Builds the movement's `motivo` text from the saved record. */
  motivo?: (record: any) => string | null;
}

interface CrudOptions {
  /** Query params that filter the list endpoint via equality match. */
  filterFields?: string[];
  /** Subset of filterFields that must be parsed as integers (foreign keys, ids). */
  intFilterFields?: string[];
  /** Subset of filterFields that must be parsed as booleans. */
  boolFilterFields?: string[];
  include?: Record<string, unknown>;
  orderBy?: Record<string, unknown> | Record<string, unknown>[];
  /** Field names on the body that should be coerced from ISO string to Date. */
  dateFields?: string[];
  beforeCreate?: (body: any) => any;
  beforeUpdate?: (body: any) => any;
  /** When set, create/update/delete run in a transaction that also maintains Insumo stock. */
  stock?: StockLinkOptions;
}

function coerceDates(body: any, dateFields: string[] = []) {
  const out = { ...body };
  for (const f of dateFields) {
    if (out[f] !== undefined && out[f] !== null && out[f] !== "") {
      out[f] = new Date(out[f]);
    } else if (out[f] === "") {
      out[f] = null;
    }
  }
  return out;
}

/** After create/update of a stock-linked record, (re)registers its SALIDA movement if it has an insumo+cantidad. */
async function sincronizarMovimientoDeStock(tx: Prisma.TransactionClient, stock: StockLinkOptions, record: any) {
  const insumoId = record[stock.insumoIdField ?? "insumoId"];
  const cantidad = record[stock.cantidadField ?? "cantidadUtilizada"];
  if (!insumoId || !cantidad) return;
  await registrarMovimiento(tx, {
    insumoId,
    tipo: "SALIDA",
    cantidad,
    fecha: record.fecha ?? new Date(),
    origen: stock.origen,
    origenId: record.id,
    motivo: stock.motivo ? stock.motivo(record) : undefined,
  });
}

/**
 * Builds a standard REST router (list+filters, get, create, update, delete) over a Prisma
 * model delegate. Covers the many structurally-identical resources in this app so each one
 * doesn't need hand-written boilerplate.
 */
export function crudRouter(delegate: any, options: CrudOptions = {}): Router {
  const {
    filterFields = [],
    intFilterFields = [],
    boolFilterFields = [],
    include,
    orderBy,
    dateFields = [],
    beforeCreate,
    beforeUpdate,
  } = options;

  const router = Router();

  const list: RequestHandler = async (req, res, next) => {
    try {
      const where: Record<string, unknown> = {};
      for (const f of filterFields) {
        const v = req.query[f];
        if (v !== undefined) {
          if (intFilterFields.includes(f)) where[f] = Number(v);
          else if (boolFilterFields.includes(f)) where[f] = v === "true";
          else where[f] = v;
        }
      }
      const items = await delegate.findMany({ where, include, orderBy });
      res.json(items);
    } catch (e) {
      next(e);
    }
  };

  const getOne: RequestHandler = async (req, res, next) => {
    try {
      const item = await delegate.findUnique({
        where: { id: Number(req.params.id) },
        include,
      });
      if (!item) {
        res.status(404).json({ error: "No encontrado" });
        return;
      }
      res.json(item);
    } catch (e) {
      next(e);
    }
  };

  const create: RequestHandler = async (req, res, next) => {
    try {
      let data = coerceDates(req.body, dateFields);
      if (beforeCreate) data = beforeCreate(data);
      const item = await delegate.create({ data, include });
      res.status(201).json(item);
    } catch (e) {
      next(e);
    }
  };

  const update: RequestHandler = async (req, res, next) => {
    try {
      let data = coerceDates(req.body, dateFields);
      if (beforeUpdate) data = beforeUpdate(data);
      const item = await delegate.update({
        where: { id: Number(req.params.id) },
        data,
        include,
      });
      res.json(item);
    } catch (e) {
      next(e);
    }
  };

  const remove: RequestHandler = async (req, res, next) => {
    try {
      await delegate.delete({ where: { id: Number(req.params.id) } });
      res.status(204).end();
    } catch (e) {
      next(e);
    }
  };

  router.get("/", list);
  router.get("/:id", getOne);
  router.post("/", create);
  router.put("/:id", update);
  router.delete("/:id", remove);

  return router;
}

/**
 * Same as crudRouter but scoped under a parent resource, e.g. /campanas/:campanaId/labores.
 * List/create are mounted on the parent path and auto-filter/inject the parent foreign key;
 * get/update/delete for an individual record are exposed on `standaloneRouter` mounted at the
 * resource's own top-level path (e.g. /labores/:id) so records remain directly addressable.
 *
 * When `options.stock` is set, create/update/delete run inside a transaction that also keeps
 * the linked Insumo's stock in sync (see sincronizarMovimientoDeStock / revertirMovimientosDeOrigen).
 * This is purely additive: resources that don't pass `stock` keep the exact same non-transactional
 * code path as before.
 */
export function nestedCrudRouter(
  delegate: any,
  parentIdField: string,
  options: CrudOptions = {}
) {
  const { include, orderBy, dateFields = [], beforeCreate, beforeUpdate, stock } = options;

  const nested = Router({ mergeParams: true });
  nested.get("/", async (req, res, next) => {
    try {
      const parentId = Number((req.params as any).campanaId ?? (req.params as any).parentId);
      const items = await delegate.findMany({
        where: { [parentIdField]: parentId },
        include,
        orderBy,
      });
      res.json(items);
    } catch (e) {
      next(e);
    }
  });
  nested.post("/", async (req, res, next) => {
    try {
      const parentId = Number((req.params as any).campanaId ?? (req.params as any).parentId);
      let data = coerceDates(req.body, dateFields);
      data[parentIdField] = parentId;
      if (beforeCreate) data = beforeCreate(data);

      if (stock) {
        const item = await prisma.$transaction(async (tx) => {
          const created = await stock.getTxDelegate(tx).create({ data, include });
          await sincronizarMovimientoDeStock(tx, stock, created);
          return created;
        });
        res.status(201).json(item);
        return;
      }

      const item = await delegate.create({ data, include });
      res.status(201).json(item);
    } catch (e) {
      next(e);
    }
  });

  const standalone = Router();
  standalone.get("/:id", async (req, res, next) => {
    try {
      const item = await delegate.findUnique({ where: { id: Number(req.params.id) }, include });
      if (!item) {
        res.status(404).json({ error: "No encontrado" });
        return;
      }
      res.json(item);
    } catch (e) {
      next(e);
    }
  });
  standalone.put("/:id", async (req, res, next) => {
    try {
      let data = coerceDates(req.body, dateFields);
      if (beforeUpdate) data = beforeUpdate(data);
      const id = Number(req.params.id);

      if (stock) {
        const item = await prisma.$transaction(async (tx) => {
          await revertirMovimientosDeOrigen(tx, stock.origen, id);
          const updated = await stock.getTxDelegate(tx).update({ where: { id }, data, include });
          await sincronizarMovimientoDeStock(tx, stock, updated);
          return updated;
        });
        res.json(item);
        return;
      }

      const item = await delegate.update({ where: { id }, data, include });
      res.json(item);
    } catch (e) {
      next(e);
    }
  });
  standalone.delete("/:id", async (req, res, next) => {
    try {
      const id = Number(req.params.id);

      if (stock) {
        await prisma.$transaction(async (tx) => {
          await revertirMovimientosDeOrigen(tx, stock.origen, id);
          await stock.getTxDelegate(tx).delete({ where: { id } });
        });
        res.status(204).end();
        return;
      }

      await delegate.delete({ where: { id } });
      res.status(204).end();
    } catch (e) {
      next(e);
    }
  });

  return { nested, standalone };
}
