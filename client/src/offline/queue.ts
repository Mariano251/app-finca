import { offlineDb, type MutationRow } from "./db";
import { notifyQueueChanged } from "./pendingStore";

const TEMP_ID_COUNTER_KEY = "offline-temp-id-counter";

/** Genera ids temporales negativos, únicos y persistentes entre reloads (contador en Dexie). */
export async function nextTempId(): Promise<number> {
  return offlineDb.transaction("rw", offlineDb.keyValue, async () => {
    const row = await offlineDb.keyValue.get(TEMP_ID_COUNTER_KEY);
    const next = (row ? Number(row.value) : 0) - 1;
    await offlineDb.keyValue.put({ key: TEMP_ID_COUNTER_KEY, value: String(next) });
    return next;
  });
}

export function isTempId(id: number): boolean {
  return id < 0;
}

export async function countPending(): Promise<number> {
  return offlineDb.mutations.count();
}

export function getPendingMutations(): Promise<MutationRow[]> {
  return offlineDb.mutations.orderBy("id").toArray();
}

/** Descarta una mutación de la cola sin sincronizarla nunca (ej. el usuario revisó un cambio
 *  offline que quedó en error y decide no reintentarlo más). No revierte nada server-side porque,
 *  si llegó a este estado, todavía no le pegó al server con éxito. */
export async function discardMutation(id: number): Promise<void> {
  await offlineDb.mutations.delete(id);
  notifyQueueChanged();
}

export async function enqueueCreate(
  resource: string,
  invalidate: string[],
  payload: Record<string, unknown>
): Promise<{ tempId: number }> {
  const tempId = await nextTempId();
  await offlineDb.mutations.add({
    resource,
    method: "create",
    tempId,
    payload,
    invalidate,
    createdAt: Date.now(),
    status: "pending",
  });
  notifyQueueChanged();
  return { tempId };
}

/** Encola la subida de una foto sacada offline. El blob se guarda tal cual en IndexedDB y se
 *  sube como multipart recién al sincronizar (ver sync.ts). `entityId` puede ser un id temporal
 *  si la foto se adjunta a un registro creado offline en la misma sesión — se remapea igual que
 *  cualquier otro campo del payload al sincronizar. */
export async function enqueuePhotoCreate(
  entityType: string,
  entityId: number,
  blob: Blob,
  fileName: string,
  descripcion?: string
): Promise<{ tempId: number }> {
  const tempId = await nextTempId();
  await offlineDb.mutations.add({
    resource: "/imagenes",
    method: "create",
    tempId,
    payload: { entityType, entityId, descripcion: descripcion ?? null, fileName },
    blob,
    invalidate: ["/imagenes"],
    createdAt: Date.now(),
    status: "pending",
  });
  notifyQueueChanged();
  return { tempId };
}

/** Encola la imagen de fondo de un croquis sacada offline (`POST /croquis/:id/imagen`). Se
 *  modela como un "update" de `/croquis` con blob adjunto: `croquisId` puede ser temporal si el
 *  croquis se creó offline en esta misma sesión. */
export async function enqueueCroquisImage(croquisId: number, blob: Blob): Promise<void> {
  await offlineDb.mutations.add({
    resource: "/croquis",
    method: "update",
    targetId: croquisId,
    payload: {},
    blob,
    invalidate: ["/croquis"],
    createdAt: Date.now(),
    status: "pending",
  });
  notifyQueueChanged();
}

export async function enqueueUpdate(
  resource: string,
  invalidate: string[],
  targetId: number,
  payload: Record<string, unknown>,
  listResources: string[] = [resource]
): Promise<void> {
  // Si el registro todavía no se sincronizó (id temporal con un "create" pendiente), no hace
  // falta un PUT aparte: alcanza con fusionar los cambios en el create que todavía no salió. El
  // create se buscó por `listResources` (ahí es donde vive un "create" para este mismo registro,
  // ya que create y update pueden usar resources distintos — ver MutationRow.listResources).
  if (isTempId(targetId)) {
    const pendingCreate = await offlineDb.mutations
      .filter(
        (m) => listResources.includes(m.resource) && m.method === "create" && m.tempId === targetId
      )
      .first();
    if (pendingCreate) {
      await offlineDb.mutations.update(pendingCreate.id!, {
        payload: { ...pendingCreate.payload, ...payload },
      });
      notifyQueueChanged();
      return;
    }
  }
  await offlineDb.mutations.add({
    resource,
    method: "update",
    targetId,
    payload,
    invalidate,
    listResources,
    createdAt: Date.now(),
    status: "pending",
  });
  notifyQueueChanged();
}

export async function enqueueDelete(
  resource: string,
  invalidate: string[],
  targetId: number,
  listResources: string[] = [resource]
): Promise<void> {
  // Cualquier update pendiente sobre este registro deja de tener sentido si se va a borrar.
  await offlineDb.mutations
    .filter((m) => m.resource === resource && m.method === "update" && m.targetId === targetId)
    .delete();

  if (isTempId(targetId)) {
    // Nunca llegó a existir en el server: si había un create pendiente (buscado por
    // `listResources`, ver comentario en enqueueUpdate), se cancela y no hay nada más que
    // sincronizar para este registro.
    await offlineDb.mutations
      .filter(
        (m) => listResources.includes(m.resource) && m.method === "create" && m.tempId === targetId
      )
      .delete();
    notifyQueueChanged();
    return;
  }

  await offlineDb.mutations.add({
    resource,
    method: "delete",
    targetId,
    invalidate,
    listResources,
    createdAt: Date.now(),
    status: "pending",
  });
  notifyQueueChanged();
}
