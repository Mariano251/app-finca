import { useEffect, useState } from "react";
import { getPendingMutations } from "./queue";
import { subscribeQueueChanged } from "./pendingStore";
import type { MutationRow } from "./db";

/** Lista viva de las mutaciones en la cola offline (pendientes o en error), para el panel de
 *  sync — ver `SyncPanel.tsx`. */
export function usePendingMutations(): MutationRow[] {
  const [items, setItems] = useState<MutationRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      getPendingMutations().then((rows) => {
        if (!cancelled) setItems(rows);
      });
    };
    refresh();
    const unsubscribe = subscribeQueueChanged(refresh);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return items;
}
