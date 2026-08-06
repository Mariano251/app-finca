import type { QueryClient } from "@tanstack/react-query";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

/** Campos con los que arranca un recurso recién creado offline, para que la forma del objeto
 *  coincida con lo que devuelve el endpoint real: relaciones que el `include` del server siempre
 *  trae (evita que la UI explote leyendo `.sectores`/`.variedades`/etc antes de sincronizar) y
 *  columnas con default en la base que el formulario no manda (ej. `stockActual` de Insumo, que
 *  arranca en 0 y se lee sin optional chaining en StockList/InsumoDetalle). */
const DEFAULT_FIELDS: Record<string, AnyRecord> = {
  "/fincas": { sectores: [] },
  "/sectores": { cuadros: [] },
  "/cuadros": { campanas: [] },
  "/cultivos": { variedades: [] },
  "/insumos": { stockActual: 0 },
  "/croquis": { poligonos: [] },
};

/** Los polígonos se crean vía `/croquis/:croquisId/poligonos` (con el id del croquis embebido en
 *  la URL, no en el payload) pero se editan/borran vía `/poligonos/:id` — un caso más del mismo
 *  patrón de resource-para-crear distinto de resource-para-editar que los subregistros de
 *  campaña, salvo que acá el dato vive *embebido* en `croquis.poligonos[]`, no en una lista
 *  aparte. */
const POLIGONO_CREATE_PATH = /^\/croquis\/(-?\d+)\/poligonos$/;

function patchLists(queryClient: QueryClient, resource: string, fn: (list: AnyRecord[]) => AnyRecord[]) {
  // `old` puede ser undefined si la lista está montada pero su fetch nunca llegó a tener éxito
  // (ej. primera carga ya offline, sin nada persistido todavía) — se trata como lista vacía en
  // vez de no-opear, si no el cambio offline no aparecería en ninguna pantalla de lista.
  queryClient.setQueriesData<AnyRecord[]>({ queryKey: [resource, "list"] }, (old) => fn(old ?? []));
}

function patchDetails(queryClient: QueryClient, resource: string, fn: (record: AnyRecord) => AnyRecord | undefined) {
  queryClient.setQueriesData<AnyRecord>({ queryKey: [resource, "detail"] }, (old) => (old ? fn(old) : old));
}

/** Busca `sectorId` (u otro parentId) dentro de `finca.sectores` en cualquier finca cacheada,
 *  para poder denormalizar `cuadro.sector.finca` en un cuadro creado offline. Best-effort: si no
 *  se encuentra (finca nunca vista en esta sesión), el cuadro simplemente queda sin `sector`
 *  embebido hasta que sincronice — la UI ya tolera esa ausencia (ver CuadroDetalle). */
function findSectorConFinca(queryClient: QueryClient, sectorId: number): AnyRecord | undefined {
  const fincas: AnyRecord[] = [
    ...queryClient.getQueriesData<AnyRecord[]>({ queryKey: ["/fincas", "list"] }).flatMap(([, d]) => d ?? []),
    ...queryClient
      .getQueriesData<AnyRecord>({ queryKey: ["/fincas", "detail"] })
      .map(([, d]) => d)
      .filter((d): d is AnyRecord => !!d),
  ];
  for (const finca of fincas) {
    const sector = (finca.sectores ?? []).find((s: AnyRecord) => s.id === sectorId);
    if (sector) return { ...sector, finca: { ...finca, sectores: undefined } };
  }
  return undefined;
}

function buildNewRecord(
  queryClient: QueryClient,
  resource: string,
  tempId: number,
  payload: AnyRecord,
  extraFields: AnyRecord = {}
): AnyRecord {
  const now = new Date().toISOString();
  let record: AnyRecord = {
    ...payload,
    id: tempId,
    createdAt: now,
    updatedAt: now,
    ...(DEFAULT_FIELDS[resource] ?? {}),
    ...payload,
    ...extraFields,
  };
  if (resource === "/cuadros" && payload.sectorId != null) {
    const sector = findSectorConFinca(queryClient, payload.sectorId);
    if (sector) record = { ...record, sector };
  }
  return record;
}

/** Reemplaza (por id) el elemento dentro de `parent[arrayField]` en todas las cachés detalle/lista
 *  de `parentResource`. `fn(existing) => nuevo | null` — `null` saca el elemento del array. */
function patchArrayById(
  queryClient: QueryClient,
  parentResource: string,
  arrayField: string,
  targetId: number,
  fn: (existing: AnyRecord) => AnyRecord | null
) {
  const updateParent = (parent: AnyRecord | undefined) => {
    if (!parent || !Array.isArray(parent[arrayField])) return parent;
    const idx = parent[arrayField].findIndex((x: AnyRecord) => x.id === targetId);
    if (idx === -1) return parent;
    const result = fn(parent[arrayField][idx]);
    const arr = parent[arrayField].slice();
    if (result === null) arr.splice(idx, 1);
    else arr[idx] = result;
    return { ...parent, [arrayField]: arr };
  };
  patchDetails(queryClient, parentResource, (p) => updateParent(p)!);
  patchLists(queryClient, parentResource, (list) => list.map((p) => updateParent(p) ?? p));
}

/** Igual que `patchArrayById` pero dos niveles: `parent[midField][i][leafField]`, ej. cuadros
 *  dentro de sectores dentro de fincas. */
function patchNestedArrayById(
  queryClient: QueryClient,
  parentResource: string,
  midField: string,
  leafField: string,
  targetId: number,
  fn: (existing: AnyRecord) => AnyRecord | null
) {
  const updateParent = (parent: AnyRecord | undefined) => {
    if (!parent || !Array.isArray(parent[midField])) return parent;
    let changed = false;
    const mid = parent[midField].map((m: AnyRecord) => {
      if (!Array.isArray(m[leafField])) return m;
      const idx = m[leafField].findIndex((x: AnyRecord) => x.id === targetId);
      if (idx === -1) return m;
      changed = true;
      const result = fn(m[leafField][idx]);
      const arr = m[leafField].slice();
      if (result === null) arr.splice(idx, 1);
      else arr[idx] = result;
      return { ...m, [leafField]: arr };
    });
    return changed ? { ...parent, [midField]: mid } : parent;
  };
  patchDetails(queryClient, parentResource, (p) => updateParent(p)!);
  patchLists(queryClient, parentResource, (list) => list.map((p) => updateParent(p) ?? p));
}

/** Inserta un registro nuevo dentro de `parent[arrayField]` donde `parent.id === parentId`. */
function insertIntoParentArray(
  queryClient: QueryClient,
  parentResource: string,
  arrayField: string,
  parentId: number,
  record: AnyRecord
) {
  const updateParent = (parent: AnyRecord | undefined) => {
    if (!parent || parent.id !== parentId) return parent;
    const arr = Array.isArray(parent[arrayField]) ? parent[arrayField] : [];
    return { ...parent, [arrayField]: [...arr, record] };
  };
  patchDetails(queryClient, parentResource, (p) => updateParent(p)!);
  patchLists(queryClient, parentResource, (list) => list.map((p) => updateParent(p) ?? p));
}

function insertIntoNestedParentArray(
  queryClient: QueryClient,
  parentResource: string,
  midField: string,
  leafField: string,
  midId: number,
  record: AnyRecord
) {
  const updateParent = (parent: AnyRecord | undefined) => {
    if (!parent || !Array.isArray(parent[midField])) return parent;
    const mid = parent[midField].map((m: AnyRecord) => {
      if (m.id !== midId) return m;
      const arr = Array.isArray(m[leafField]) ? m[leafField] : [];
      return { ...m, [leafField]: [...arr, record] };
    });
    return { ...parent, [midField]: mid };
  };
  patchDetails(queryClient, parentResource, (p) => updateParent(p)!);
  patchLists(queryClient, parentResource, (list) => list.map((p) => updateParent(p) ?? p));
}

function withEmbeddings(
  resource: string,
  payload: AnyRecord,
  op: {
    onSector: (fincaId: number) => void;
    onCuadro: (sectorId: number) => void;
    onVariedad: (cultivoId: number) => void;
    onPoligono: (croquisId: number) => void;
  }
) {
  const poligonoMatch = resource.match(POLIGONO_CREATE_PATH);
  if (resource === "/sectores" && payload.fincaId != null) op.onSector(payload.fincaId);
  else if (resource === "/cuadros" && payload.sectorId != null) op.onCuadro(payload.sectorId);
  else if (resource === "/variedades" && payload.cultivoId != null) op.onVariedad(payload.cultivoId);
  else if (poligonoMatch) op.onPoligono(Number(poligonoMatch[1]));
}

/** Aplica una creación offline al cache de TanStack Query: cache propio (detail+list) más los
 *  anidamientos conocidos (sectores en finca, cuadros en sector/finca, variedades en cultivo).
 *  Devuelve el registro optimista (con el id temporal) para resolver la mutación. */
export function applyOptimisticCreate(
  queryClient: QueryClient,
  resource: string,
  tempId: number,
  payload: AnyRecord,
  extraFields: AnyRecord = {}
): AnyRecord {
  const record = buildNewRecord(queryClient, resource, tempId, payload, extraFields);

  queryClient.setQueryData([resource, "detail", tempId], record);
  patchLists(queryClient, resource, (list) => [...list, record]);

  withEmbeddings(resource, payload, {
    onSector: (fincaId) => insertIntoParentArray(queryClient, "/fincas", "sectores", fincaId, record),
    onCuadro: (sectorId) => {
      insertIntoNestedParentArray(queryClient, "/fincas", "sectores", "cuadros", sectorId, record);
      insertIntoParentArray(queryClient, "/sectores", "cuadros", sectorId, record);
    },
    onVariedad: (cultivoId) => insertIntoParentArray(queryClient, "/cultivos", "variedades", cultivoId, record),
    onPoligono: (croquisId) => insertIntoParentArray(queryClient, "/croquis", "poligonos", croquisId, record),
  });

  return record;
}

/** Recursos anidados (labores, aplicaciones, etc.) crean vía `/campanas/:id/xxx` pero editan y
 *  borran vía `/xxx/:id` (ver server/src/routes/subregistros.ts) — dos strings de resource
 *  distintos para el mismo dato. `listResources` son las claves de cache donde ese registro
 *  efectivamente se muestra (normalmente el path anidado), que pueden no coincidir con `resource`
 *  (el path usado para el PUT/DELETE real). Por default coincide con `resource`, que es el caso
 *  de Fase 2 (Finca/Sector/Cuadro/Cultivo/Variedad/Insumo, donde ambos paths son el mismo). */

/** Aplica una edición offline: fusiona `payload` sobre lo que ya hubiera en cache (propio,
 *  `listResources` y anidamientos conocidos). Devuelve el registro resultante. */
export function applyOptimisticUpdate(
  queryClient: QueryClient,
  resource: string,
  targetId: number,
  payload: AnyRecord,
  listResources: string[] = [resource]
): AnyRecord {
  const updatedAt = new Date().toISOString();
  const merge = (existing: AnyRecord | undefined): AnyRecord =>
    existing ? { ...existing, ...payload, id: targetId, updatedAt } : { ...payload, id: targetId, updatedAt };

  let result: AnyRecord | undefined;
  queryClient.setQueryData([resource, "detail", targetId], (old: AnyRecord | undefined) => {
    result = merge(old);
    return result;
  });
  for (const listResource of new Set([resource, ...listResources])) {
    patchLists(queryClient, listResource, (list) => list.map((x) => (x.id === targetId ? merge(x) : x)));
  }

  if (resource === "/sectores") patchArrayById(queryClient, "/fincas", "sectores", targetId, merge);
  else if (resource === "/cuadros") {
    patchNestedArrayById(queryClient, "/fincas", "sectores", "cuadros", targetId, merge);
    patchArrayById(queryClient, "/sectores", "cuadros", targetId, merge);
  } else if (resource === "/variedades") patchArrayById(queryClient, "/cultivos", "variedades", targetId, merge);
  else if (resource === "/poligonos") patchArrayById(queryClient, "/croquis", "poligonos", targetId, merge);

  return result!;
}

/** Aplica un borrado offline: saca el registro de todas las cachés (propio, `listResources` y
 *  anidamientos conocidos). */
export function applyOptimisticDelete(
  queryClient: QueryClient,
  resource: string,
  targetId: number,
  listResources: string[] = [resource]
): void {
  queryClient.removeQueries({ queryKey: [resource, "detail", targetId] });
  for (const listResource of new Set([resource, ...listResources])) {
    patchLists(queryClient, listResource, (list) => list.filter((x) => x.id !== targetId));
  }

  if (resource === "/sectores") patchArrayById(queryClient, "/fincas", "sectores", targetId, () => null);
  else if (resource === "/cuadros") {
    patchNestedArrayById(queryClient, "/fincas", "sectores", "cuadros", targetId, () => null);
    patchArrayById(queryClient, "/sectores", "cuadros", targetId, () => null);
  } else if (resource === "/variedades") patchArrayById(queryClient, "/cultivos", "variedades", targetId, () => null);
  else if (resource === "/poligonos") patchArrayById(queryClient, "/croquis", "poligonos", targetId, () => null);
}

/** Después de sincronizar, reemplaza cualquier rastro de `oldId` (temporal o real) por el
 *  registro canónico que devolvió el server, en cache propio, `listResources` y anidamientos. */
export function replaceRecordEverywhere(
  queryClient: QueryClient,
  resource: string,
  oldId: number,
  serverRecord: AnyRecord,
  listResources: string[] = [resource]
): void {
  queryClient.setQueryData([resource, "detail", oldId], serverRecord);
  if (serverRecord.id !== oldId) queryClient.setQueryData([resource, "detail", serverRecord.id], serverRecord);
  for (const listResource of new Set([resource, ...listResources])) {
    patchLists(queryClient, listResource, (list) => list.map((x) => (x.id === oldId ? serverRecord : x)));
  }

  if (resource === "/sectores") patchArrayById(queryClient, "/fincas", "sectores", oldId, () => serverRecord);
  else if (resource === "/cuadros") {
    patchNestedArrayById(queryClient, "/fincas", "sectores", "cuadros", oldId, () => serverRecord);
    patchArrayById(queryClient, "/sectores", "cuadros", oldId, () => serverRecord);
  } else if (resource === "/variedades")
    patchArrayById(queryClient, "/cultivos", "variedades", oldId, () => serverRecord);
  else if (resource === "/poligonos" || POLIGONO_CREATE_PATH.test(resource))
    patchArrayById(queryClient, "/croquis", "poligonos", oldId, () => serverRecord);
}
