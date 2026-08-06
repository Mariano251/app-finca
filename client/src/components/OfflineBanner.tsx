import { useEffect, useState } from "react";
import { useQueryClient, type QueryCache } from "@tanstack/react-query";
import { usePendingMutations } from "../offline/usePendingMutations";
import { SyncPanel } from "./SyncPanel";

/** Más reciente `dataUpdatedAt` entre todas las queries en cache (0 si ninguna cargó nunca). */
function getLastUpdatedAt(cache: QueryCache): number {
  let max = 0;
  for (const query of cache.getAll()) {
    if (query.state.dataUpdatedAt > max) max = query.state.dataUpdatedAt;
  }
  return max;
}

function pendingLabel(count: number, errorCount: number): string {
  const base = count === 1 ? "1 cambio pendiente de sincronizar" : `${count} cambios pendientes de sincronizar`;
  return errorCount > 0 ? `${base} (${errorCount} con error)` : base;
}

export function OfflineBanner() {
  const queryClient = useQueryClient();
  const [online, setOnline] = useState(navigator.onLine);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(() =>
    getLastUpdatedAt(queryClient.getQueryCache())
  );
  const [showPanel, setShowPanel] = useState(false);
  const pending = usePendingMutations();
  const errorCount = pending.filter((m) => m.status === "error").length;

  useEffect(() => {
    const cache = queryClient.getQueryCache();
    // Se actualiza con cada cambio de cache (haya o no red) para tener siempre a mano el
    // horario del dato más nuevo en el momento en que se corta la conexión.
    const unsubscribe = cache.subscribe(() => setLastUpdatedAt(getLastUpdatedAt(cache)));
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      unsubscribe();
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [queryClient]);

  if (online && pending.length === 0) return null;

  const horario = lastUpdatedAt
    ? new Date(lastUpdatedAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
    : undefined;
  const background = !online ? "var(--color-danger)" : errorCount > 0 ? "#b3762e" : "var(--color-primary)";

  return (
    <>
      <button
        type="button"
        onClick={() => setShowPanel(true)}
        style={{
          display: "block",
          width: "100%",
          background,
          color: "white",
          textAlign: "center",
          padding: "0.4rem",
          fontSize: "0.82rem",
          position: "sticky",
          top: 0,
          zIndex: 30,
          border: "none",
          cursor: "pointer",
        }}
      >
        {online ? (
          <>Sincronizando {pendingLabel(pending.length, errorCount)}… (tocar para ver detalle)</>
        ) : (
          <>
            Sin conexión — mostrando datos{horario ? ` de las ${horario}` : " guardados"}
            {pending.length > 0 ? `. ${pendingLabel(pending.length, errorCount)}` : ""}. Se van a
            actualizar solos cuando vuelva la señal.
          </>
        )}
      </button>
      {showPanel && <SyncPanel onClose={() => setShowPanel(false)} />}
    </>
  );
}
