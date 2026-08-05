import { Router, type RequestHandler } from "express";

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
 */
export function nestedCrudRouter(
  delegate: any,
  parentIdField: string,
  options: CrudOptions = {}
) {
  const { include, orderBy, dateFields = [], beforeCreate, beforeUpdate } = options;

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
      const item = await delegate.update({
        where: { id: Number(req.params.id) },
        data,
        include,
      });
      res.json(item);
    } catch (e) {
      next(e);
    }
  });
  standalone.delete("/:id", async (req, res, next) => {
    try {
      await delegate.delete({ where: { id: Number(req.params.id) } });
      res.status(204).end();
    } catch (e) {
      next(e);
    }
  });

  return { nested, standalone };
}
