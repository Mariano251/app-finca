import type { AsyncStorage } from "@tanstack/query-persist-client-core";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { offlineDb } from "./db";

const QUERY_CACHE_KEY = "app-finca-query-cache";

/** Adapta la tabla `keyValue` de Dexie a la interfaz AsyncStorage que pide el persister. */
const dexieStorage: AsyncStorage<string> = {
  getItem: async (key) => {
    const row = await offlineDb.keyValue.get(key);
    return row?.value ?? null;
  },
  setItem: async (key, value) => {
    await offlineDb.keyValue.put({ key, value });
  },
  removeItem: async (key) => {
    await offlineDb.keyValue.delete(key);
  },
};

export const queryPersister = createAsyncStoragePersister({
  storage: dexieStorage,
  key: QUERY_CACHE_KEY,
  throttleTime: 1000,
});
