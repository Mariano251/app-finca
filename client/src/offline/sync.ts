import type { QueryClient } from "@tanstack/react-query";
import axios from "axios";
import { api } from "../api/client";
import { offlineDb, type MutationRow } from "./db";
import { isTempId } from "./queue";
import { replaceRecordEverywhere } from "./cachePatch";
import { notifyQueueChanged } from "./pendingStore";
import { isConnectivityError } from "./isConnectivityError";

/** Reemplaza los ids temporales negativos por sus ids reales ya resueltos en `idMap`. Si algún
 *  valor sigue siendo temporal y no resuelto, `unresolved` queda en true (la mutación depende de
 *  otra que todavía no sincronizó, típicamente porque esa otra falló). */
function remap(value: unknown, idMap: Map<number, number>): { value: unknown; unresolved: boolean } {
  if (typeof value === "number" && isTempId(value)) {
    return idMap.has(value) ? { value: idMap.get(value), unresolved: false } : { value, unresolved: true };
  }
  return { value, unresolved: false };
}

function remapPayload(payload: Record<string, unknown> | undefined, idMap: Map<number, number>) {
  if (!payload) return { payload, unresolved: false };
  const out: Record<string, unknown> = {};
  let unresolved = false;
  for (const [k, v] of Object.entries(payload)) {
    const r = remap(v, idMap);
    out[k] = r.value;
    unresolved = unresolved || r.unresolved;
  }
  return { payload: out, unresolved };
}

/** Solo hace falta para "create": algunos recursos (polígonos de croquis) construyen la URL de
 *  creación con el id del padre embebido (`/croquis/:id/poligonos`) en vez de mandarlo en el
 *  payload — si ese padre se creó offline en la misma sesión, ese id embebido puede seguir siendo
 *  temporal y hay que remapearlo antes de pegarle al server. */
function remapResourcePath(resource: string, idMap: Map<number, number>): { resource: string; unresolved: boolean } {
  let unresolved = false;
  const remapped = resource
    .split("/")
    .map((segment) => {
      if (!/^-\d+$/.test(segment)) return segment;
      const n = Number(segment);
      if (idMap.has(n)) return String(idMap.get(n));
      unresolved = true;
      return segment;
    })
    .join("/");
  return { resource: remapped, unresolved };
}

/** Sube un archivo encolado offline como multipart. Cubre dos formas: una foto nueva en
 *  `/imagenes` (entityType/entityId/descripcion en el payload) y la imagen de fondo de un croquis
 *  (`POST /croquis/:id/imagen`, sin más campos que el archivo). */
async function postBlob(
  url: string,
  isCroquisImagen: boolean,
  blob: Blob,
  payload: Record<string, unknown> | undefined
) {
  const form = new FormData();
  if (isCroquisImagen) {
    form.append("file", blob, "croquis.jpg");
  } else {
    form.append("file", blob, (payload?.fileName as string) ?? "foto.jpg");
    form.append("entityType", String(payload?.entityType ?? ""));
    form.append("entityId", String(payload?.entityId ?? ""));
    if (payload?.descripcion) form.append("descripcion", String(payload.descripcion));
  }
  const { data } = await api.post(url, form);
  return data;
}

/** La foto/imagen optimista mostraba un object URL local (`URL.createObjectURL`) mientras no
 *  había señal — libera esa memoria ahora que ya está el path real, comparando contra `.path`
 *  (Imagen) o `.imagenPath` (Croquis), lo que corresponda. */
function revokeStaleBlobUrl(queryClient: QueryClient, resource: string, cacheId: number) {
  const previous = queryClient.getQueryData<Record<string, unknown>>([resource, "detail", cacheId]);
  const candidate = previous?.path ?? previous?.imagenPath;
  if (typeof candidate === "string" && candidate.startsWith("blob:")) URL.revokeObjectURL(candidate);
}

let syncing = false;

export function isSyncRunning(): boolean {
  return syncing;
}

/** Dispara una pasada de sincronización si hay conexión y no hay una corriendo ya. Se llama
 *  desde el evento `online`, al arrancar la app, después de cada mutación (por si la conexión ya
 *  había vuelto sin que se notara), y a mano desde el botón "Reintentar" del panel de sync. No
 *  hace nada si no hay nada pendiente o si está offline. */
export function scheduleSync(queryClient: QueryClient): void {
  if (syncing || !navigator.onLine) return;
  syncing = true;
  notifyQueueChanged();
  runSync(queryClient).finally(() => {
    syncing = false;
    notifyQueueChanged();
  });
}

/** Procesa un item de la cola. Devuelve `false` si hay que cortar toda la pasada (se perdió la
 *  conexión de nuevo a mitad de camino) — ese item y los siguientes quedan pendientes para el
 *  próximo intento. Cualquier otro error (validación, 404, etc.) se guarda en el item mismo y
 *  no bloquea al resto de la cola. */
async function processItem(
  queryClient: QueryClient,
  item: MutationRow,
  idMap: Map<number, number>,
  invalidate: Set<string>
): Promise<boolean> {
  const targetRemap = item.targetId != null ? remap(item.targetId, idMap) : { value: undefined, unresolved: false };
  const { payload, unresolved: payloadUnresolved } = remapPayload(item.payload, idMap);
  const resourceRemap = item.method === "create" ? remapResourcePath(item.resource, idMap) : { resource: item.resource, unresolved: false };

  if (targetRemap.unresolved || payloadUnresolved || resourceRemap.unresolved) {
    await offlineDb.mutations.update(item.id!, {
      status: "error",
      error: "Depende de otro cambio offline que todavía no se sincronizó.",
    });
    return true;
  }

  try {
    if (item.method === "create") {
      const data = item.blob
        ? await postBlob(resourceRemap.resource, false, item.blob, payload)
        : (await api.post(resourceRemap.resource, payload)).data;
      idMap.set(item.tempId!, data.id);
      revokeStaleBlobUrl(queryClient, item.resource, item.tempId!);
      replaceRecordEverywhere(queryClient, item.resource, item.tempId!, data);
    } else if (item.method === "update") {
      const data = item.blob
        ? await postBlob(`${item.resource}/${targetRemap.value}/imagen`, true, item.blob, payload)
        : (await api.put(`${item.resource}/${targetRemap.value}`, payload)).data;
      revokeStaleBlobUrl(queryClient, item.resource, targetRemap.value as number);
      replaceRecordEverywhere(queryClient, item.resource, targetRemap.value as number, data, item.listResources);
    } else {
      try {
        await api.delete(`${item.resource}/${targetRemap.value}`);
      } catch (e) {
        if (!(axios.isAxiosError(e) && e.response?.status === 404)) throw e;
      }
    }
    item.invalidate.forEach((r) => invalidate.add(r));
    await offlineDb.mutations.delete(item.id!);
    notifyQueueChanged();
    return true;
  } catch (error) {
    if (isConnectivityError(error)) return false;
    const message = axios.isAxiosError(error)
      ? ((error.response?.data as { error?: string } | undefined)?.error ?? error.message)
      : String(error);
    await offlineDb.mutations.update(item.id!, { status: "error", error: message });
    notifyQueueChanged();
    return true;
  }
}

async function runSync(queryClient: QueryClient): Promise<void> {
  const idMap = new Map<number, number>();
  const invalidate = new Set<string>();
  const items = await offlineDb.mutations.orderBy("id").toArray();

  for (const item of items) {
    if (!navigator.onLine) break; // se volvió a cortar; el resto queda para el próximo intento
    const keepGoing = await processItem(queryClient, item, idMap, invalidate);
    if (!keepGoing) break;
  }

  notifyQueueChanged();
  for (const resource of invalidate) {
    queryClient.invalidateQueries({ queryKey: [resource] });
  }
}

/** Se llama una sola vez al arrancar la app: escucha reconexión y dispara una sincronización
 *  inicial por si quedaron cambios pendientes de una sesión anterior y ya hay señal. */
export function initSyncEngine(queryClient: QueryClient): void {
  window.addEventListener("online", () => scheduleSync(queryClient));
  if (navigator.onLine) scheduleSync(queryClient);
}
