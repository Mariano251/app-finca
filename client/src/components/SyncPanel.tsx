import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "./Modal";
import { usePendingMutations } from "../offline/usePendingMutations";
import { discardMutation } from "../offline/queue";
import { scheduleSync } from "../offline/sync";
import { describeMutation } from "../offline/describeMutation";

export function SyncPanel({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const items = usePendingMutations();
  const errores = items.filter((i) => i.status === "error");
  const online = navigator.onLine;

  return (
    <Modal title={`Cambios sin sincronizar (${items.length})`} onClose={onClose}>
      {items.length === 0 ? (
        <p className="text-muted">No hay cambios pendientes — todo sincronizado.</p>
      ) : (
        <>
          {!online && (
            <p className="text-muted" style={{ fontSize: "0.85rem" }}>
              Sin conexión: se van a reintentar solos cuando vuelva la señal.
            </p>
          )}
          {errores.length > 0 && online && (
            <p style={{ fontSize: "0.85rem", color: "var(--color-danger)" }}>
              {errores.length === 1 ? "1 cambio no se pudo sincronizar" : `${errores.length} cambios no se pudieron sincronizar`}{" "}
              — revisá el detalle abajo. El resto sí se está subiendo solo.
            </p>
          )}
          <ul style={{ listStyle: "none", padding: 0, margin: "0.5rem 0", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {items.map((item) => (
              <li
                key={item.id}
                className="card"
                style={{ padding: "0.6rem 0.75rem", display: "flex", justifyContent: "space-between", gap: "0.5rem" }}
              >
                <div>
                  <div style={{ fontSize: "0.9rem" }}>{describeMutation(item)}</div>
                  {item.status === "error" && (
                    <div style={{ fontSize: "0.78rem", color: "var(--color-danger)", marginTop: "0.2rem" }}>
                      {item.error}
                    </div>
                  )}
                </div>
                <button
                  className="btn secondary small"
                  type="button"
                  onClick={() => {
                    if (confirm("¿Descartar este cambio? No se va a subir nunca al servidor.")) {
                      discardMutation(item.id!);
                    }
                  }}
                >
                  Descartar
                </button>
              </li>
            ))}
          </ul>
          <button className="btn small" type="button" disabled={!online} onClick={() => scheduleSync(qc)}>
            {online ? "Reintentar ahora" : "Sin conexión"}
          </button>
        </>
      )}
    </Modal>
  );
}
