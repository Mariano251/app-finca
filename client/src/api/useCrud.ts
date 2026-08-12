import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { api } from "./client";
import { applyOptimisticDelete, applyOptimisticUpdate } from "../offline/cachePatch";
import { enqueueDelete, enqueueUpdate } from "../offline/queue";
import { scheduleSync } from "../offline/sync";
import { isConnectivityError } from "../offline/isConnectivityError";
import { createOffline } from "../offline/offlinePost";

/**
 * Generic REST hooks over a resource path (e.g. "/fincas", or a nested path like
 * `/campanas/${id}/labores`). Mirrors the server's crudRouter/nestedCrudRouter shape so pages
 * don't hand-roll fetch/mutation boilerplate for the ~20 similar resources in this app.
 *
 * Escritura offline: si el POST/PUT/DELETE falla por falta de conexión (no por un error del
 * server), la mutación se guarda en una cola local (`../offline/queue.ts`) y se aplica de forma
 * optimista al cache de TanStack Query (`../offline/cachePatch.ts`), para que la pantalla
 * muestre el cambio al toque. La cola se reproduce sola contra el server cuando vuelve la señal
 * (`../offline/sync.ts`). Si el error SÍ tiene response (validación, 404, etc.) se deja pasar
 * tal cual, como antes.
 */

export function useList<T>(
  resource: string,
  params?: Record<string, unknown>,
  options?: Partial<UseQueryOptions<T[]>>
) {
  return useQuery<T[]>({
    queryKey: [resource, "list", params],
    queryFn: async () => (await api.get(resource, { params })).data,
    ...options,
  });
}

export function useOne<T>(resource: string, id?: number | string | null) {
  return useQuery<T>({
    queryKey: [resource, "detail", id],
    queryFn: async () => (await api.get(`${resource}/${id}`)).data,
    enabled: id !== undefined && id !== null,
  });
}

export function useCreate<T = unknown>(resource: string, invalidate: string[] = [resource]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<T>) => createOffline<T>(qc, resource, invalidate, data as Record<string, unknown>),
  });
}

/**
 * `listResources`: dónde vive este registro en el cache, si difiere de `resource` — caso de los
 * subregistros de campaña, que editan/borran vía `/xxx/:id` pero se muestran (y se crean) vía
 * `/campanas/:id/xxx`. Por default coincide con `resource` (todos los demás recursos).
 */
export function useUpdate<T = unknown>(
  resource: string,
  invalidate: string[] = [resource],
  listResources: string[] = [resource]
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number | string; data: Partial<T> }): Promise<T> => {
      try {
        return (await api.put(`${resource}/${id}`, data)).data;
      } catch (error) {
        if (!isConnectivityError(error)) throw error;
        const targetId = Number(id);
        await enqueueUpdate(resource, invalidate, targetId, data as Record<string, unknown>, listResources);
        return applyOptimisticUpdate(qc, resource, targetId, data as Record<string, unknown>, listResources) as T;
      }
    },
    onSuccess: () => {
      invalidate.forEach((r) => qc.invalidateQueries({ queryKey: [r] }));
      scheduleSync(qc);
    },
  });
}

export function useDelete(
  resource: string,
  invalidate: string[] = [resource],
  listResources: string[] = [resource]
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number | string) => {
      try {
        return (await api.delete(`${resource}/${id}`)).data;
      } catch (error) {
        if (!isConnectivityError(error)) throw error;
        const targetId = Number(id);
        applyOptimisticDelete(qc, resource, targetId, listResources);
        await enqueueDelete(resource, invalidate, targetId, listResources);
        return { queued: true };
      }
    },
    onSuccess: () => {
      invalidate.forEach((r) => qc.invalidateQueries({ queryKey: [r] }));
      scheduleSync(qc);
    },
  });
}
