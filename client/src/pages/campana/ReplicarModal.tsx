import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useList } from "../../api/useCrud";
import { createOffline } from "../../offline/offlinePost";
import { Modal } from "../../components/Modal";
import type { Cuadro } from "../../api/types";
import type { SubRecordConfig } from "./subRecordConfig";

/** Campos que no tiene sentido (o es incorrecto) copiar tal cual a otro cuadro: identidad del
 *  registro origen y su ubicación en el croquis de ESE cuadro puntual. */
const OMIT_FIELDS = [
  "id",
  "campanaId",
  "createdAt",
  "updatedAt",
  "croquisId",
  "croquisX",
  "croquisY",
  "radioMetros",
];

/** Deja cargar una vez un problema sanitario (maleza/enfermedad/plaga) y copiarlo, con los mismos
 *  datos, a cualquier otro cuadro de la finca que tenga campaña activa — para el caso típico de un
 *  recorrido donde el mismo problema aparece en varios cuadros el mismo día. */
export function ReplicarModal({
  record,
  config,
  fincaId,
  cuadroActualId,
  onClose,
}: {
  record: Record<string, unknown>;
  config: SubRecordConfig;
  fincaId?: number;
  cuadroActualId?: number;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { data: cuadros, isLoading } = useList<Cuadro>(
    "/cuadros",
    fincaId != null ? { fincaId } : undefined,
    { enabled: fincaId != null }
  );
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set());
  const [enviando, setEnviando] = useState(false);

  const candidatos = (cuadros ?? []).filter(
    (c) => c.id !== cuadroActualId && (c.campanas?.length ?? 0) > 0
  );

  function toggle(id: number) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit() {
    const payload: Record<string, unknown> = { ...record };
    for (const f of OMIT_FIELDS) delete payload[f];
    delete payload.insumo;

    const campanaIds = candidatos
      .filter((c) => seleccionados.has(c.id))
      .flatMap((c) => (c.campanas ?? []).map((camp) => camp.id));

    setEnviando(true);
    try {
      for (const campanaId of campanaIds) {
        const nestedPath = `/campanas/${campanaId}/${config.path}`;
        await createOffline(qc, nestedPath, [nestedPath], payload);
      }
      onClose();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal title={`Copiar "${config.label}" a otros cuadros`} onClose={onClose}>
      {fincaId == null ? (
        <p className="text-muted">No se pudo determinar la finca de este cuadro.</p>
      ) : isLoading ? (
        <p className="text-muted">Cargando cuadros…</p>
      ) : candidatos.length === 0 ? (
        <p className="text-muted">No hay otros cuadros con campañas activas en esta finca.</p>
      ) : (
        <>
          <p className="text-muted" style={{ fontSize: "0.85rem", marginBottom: "0.5rem" }}>
            Se crea el mismo registro (especie, nivel, tratamiento, fecha, etc.) en cada cuadro que
            marques, sin la ubicación en el croquis de este cuadro.
          </p>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.4rem",
              maxHeight: "260px",
              overflowY: "auto",
            }}
          >
            {candidatos.map((c) => (
              <label key={c.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input type="checkbox" checked={seleccionados.has(c.id)} onChange={() => toggle(c.id)} />
                <span>
                  {c.nombre}
                  <span className="text-muted">
                    {" — "}
                    {c.sector?.nombre}
                    {c.campanas && c.campanas.length > 0
                      ? ` · ${c.campanas.map((camp) => camp.cultivo?.nombre).filter(Boolean).join(", ")}`
                      : ""}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
            <button className="btn secondary" type="button" onClick={onClose}>
              Cancelar
            </button>
            <button
              className="btn"
              type="button"
              disabled={seleccionados.size === 0 || enviando}
              onClick={handleSubmit}
            >
              {enviando
                ? "Copiando…"
                : `Copiar a ${seleccionados.size} cuadro${seleccionados.size === 1 ? "" : "s"}`}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
