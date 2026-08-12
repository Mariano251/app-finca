import type { QueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { applyOptimisticCreate } from "./cachePatch";
import { enqueueCreate } from "./queue";
import { scheduleSync } from "./sync";
import { isConnectivityError } from "./isConnectivityError";

/** El mismo create-con-fallback-offline que usa `useCreate`, expuesto como función suelta (no
 *  hook) para poder llamarlo en un loop — ej. replicar un registro a varias campañas — sin violar
 *  las reglas de hooks por tener un número variable de llamadas. */
export async function createOffline<T = unknown>(
  qc: QueryClient,
  resource: string,
  invalidate: string[],
  payload: Record<string, unknown>
): Promise<T> {
  let result: T;
  try {
    result = (await api.post(resource, payload)).data;
  } catch (error) {
    if (!isConnectivityError(error)) throw error;
    const { tempId } = await enqueueCreate(resource, invalidate, payload);
    result = applyOptimisticCreate(qc, resource, tempId, payload) as T;
  }
  invalidate.forEach((r) => qc.invalidateQueries({ queryKey: [r] }));
  scheduleSync(qc);
  return result;
}
