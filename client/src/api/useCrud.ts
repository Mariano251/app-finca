import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { api } from "./client";

/**
 * Generic REST hooks over a resource path (e.g. "/fincas", or a nested path like
 * `/campanas/${id}/labores`). Mirrors the server's crudRouter/nestedCrudRouter shape so pages
 * don't hand-roll fetch/mutation boilerplate for the ~20 similar resources in this app.
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
    mutationFn: async (data: Partial<T>) => (await api.post(resource, data)).data,
    onSuccess: () => invalidate.forEach((r) => qc.invalidateQueries({ queryKey: [r] })),
  });
}

export function useUpdate<T = unknown>(resource: string, invalidate: string[] = [resource]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number | string; data: Partial<T> }) =>
      (await api.put(`${resource}/${id}`, data)).data,
    onSuccess: () => invalidate.forEach((r) => qc.invalidateQueries({ queryKey: [r] })),
  });
}

export function useDelete(resource: string, invalidate: string[] = [resource]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number | string) => (await api.delete(`${resource}/${id}`)).data,
    onSuccess: () => invalidate.forEach((r) => qc.invalidateQueries({ queryKey: [r] })),
  });
}
