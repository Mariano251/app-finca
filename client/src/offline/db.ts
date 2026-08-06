import Dexie, { type Table } from "dexie";

interface KeyValueRow {
  key: string;
  value: string;
}

export interface MutationRow {
  id?: number;
  resource: string;
  method: "create" | "update" | "delete";
  /** Id temporal (negativo) asignado localmente. Solo para method "create". */
  tempId?: number;
  /** Id del registro afectado. Para "update"/"delete"; puede ser temporal si el registro
   *  todavía no se sincronizó. */
  targetId?: number;
  payload?: Record<string, unknown>;
  /** Solo para fotos offline (`resource === "/imagenes"`): el archivo en sí. IndexedDB guarda
   *  Blobs de forma nativa. Se sube como multipart recién al sincronizar. */
  blob?: Blob;
  /** Resources a invalidar en TanStack Query una vez sincronizada esta mutación. */
  invalidate: string[];
  /** Claves de cache donde este registro se muestra, si difieren de `resource` (ej. subregistros
   *  de campaña: se crean vía `/campanas/:id/xxx` pero editan/borran vía `/xxx/:id`). Para
   *  "create" no hace falta: `resource` ya es la lista donde aparece. */
  listResources?: string[];
  createdAt: number;
  status: "pending" | "error";
  error?: string;
}

/**
 * Única base IndexedDB de la app para todo lo offline: el cache de TanStack Query (tabla
 * `keyValue`, Fase 1) y la cola de mutaciones pendientes de sincronizar (tabla `mutations`,
 * Fase 2+).
 */
class OfflineDatabase extends Dexie {
  keyValue!: Table<KeyValueRow, string>;
  mutations!: Table<MutationRow, number>;

  constructor() {
    super("app-finca-offline");
    this.version(1).stores({
      keyValue: "key",
    });
    this.version(2).stores({
      keyValue: "key",
      mutations: "++id",
    });
  }
}

export const offlineDb = new OfflineDatabase();
