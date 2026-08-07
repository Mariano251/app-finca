import { useEffect, useState } from "react";
import { Modal } from "../Modal";
import { useList, useOne } from "../../api/useCrud";
import type { Cuadro } from "../../api/types";
import { NIVEL_INFESTACION_OPTIONS } from "../../constants";

export type TipoRegistroCroquis = "enfermedad" | "maleza";

interface RegistroBase {
  id: number;
  fecha: string;
  croquisId?: number | null;
  [key: string]: unknown;
}

const CONFIG: Record<
  TipoRegistroCroquis,
  {
    titulo: string;
    resourcePath: string;
    nombreField: string;
    nivelField: string;
    nombreLabel: string;
    nivelLabel: string;
  }
> = {
  enfermedad: {
    titulo: "Marcar enfermedad en el croquis",
    resourcePath: "enfermedades",
    nombreField: "nombre",
    nivelField: "nivelIncidencia",
    nombreLabel: "Enfermedad",
    nivelLabel: "Nivel de incidencia",
  },
  maleza: {
    titulo: "Marcar maleza en el croquis",
    resourcePath: "malezas",
    nombreField: "especie",
    nivelField: "nivelInfestacion",
    nombreLabel: "Maleza (especie)",
    nivelLabel: "Nivel de infestación",
  },
};

export type MarcarRegistroResult =
  | { mode: "nueva"; campanaId: number; data: Record<string, unknown> }
  | { mode: "existente"; registroId: number };

export function MarcarRegistroModal({
  tipo,
  cuadros,
  cuadroIdPreseleccionado,
  onClose,
  onConfirm,
}: {
  tipo: TipoRegistroCroquis;
  cuadros: Cuadro[];
  cuadroIdPreseleccionado?: number | null;
  onClose: () => void;
  onConfirm: (result: MarcarRegistroResult) => void;
}) {
  const cfg = CONFIG[tipo];
  const [cuadroId, setCuadroId] = useState<string>(
    cuadroIdPreseleccionado ? String(cuadroIdPreseleccionado) : ""
  );
  const [campanaId, setCampanaId] = useState<string>("");
  const [modo, setModo] = useState<"nueva" | "existente">("nueva");
  const [registroId, setRegistroId] = useState<string>("");
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [nombre, setNombre] = useState("");
  const [nivel, setNivel] = useState("BAJO");

  const { data: cuadroDetalle } = useOne<Cuadro>("/cuadros", cuadroId ? Number(cuadroId) : undefined);
  const campanas = cuadroDetalle?.campanas ?? [];

  useEffect(() => {
    if (!campanaId) {
      const activa = campanas.find((c) => c.estado === "ACTIVA");
      if (activa) setCampanaId(String(activa.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campanas.length]);

  const { data: registrosCampana } = useList<RegistroBase>(
    campanaId ? `/campanas/${campanaId}/${cfg.resourcePath}` : `/campanas/_/${cfg.resourcePath}`,
    undefined,
    { enabled: !!campanaId }
  );
  const registrosSinUbicar = (registrosCampana ?? []).filter((r) => !r.croquisId);

  const puedeConfirmar =
    !!campanaId && (modo === "nueva" ? nombre.trim().length > 0 : registroId !== "");

  function handleConfirm() {
    if (!puedeConfirmar) return;
    if (modo === "nueva") {
      onConfirm({
        mode: "nueva",
        campanaId: Number(campanaId),
        data: { fecha, [cfg.nombreField]: nombre.trim(), [cfg.nivelField]: nivel },
      });
    } else {
      onConfirm({ mode: "existente", registroId: Number(registroId) });
    }
  }

  return (
    <Modal title={cfg.titulo} onClose={onClose}>
      <div className="field">
        <label>Cuadro</label>
        <select
          value={cuadroId}
          onChange={(e) => {
            setCuadroId(e.target.value);
            setCampanaId("");
          }}
        >
          <option value="">— elegir —</option>
          {cuadros.map((c) => (
            <option key={c.id} value={c.id}>
              {c.sector?.nombre ? `${c.sector.nombre} / ` : ""}
              {c.nombre}
            </option>
          ))}
        </select>
      </div>

      {cuadroId && (
        <div className="field">
          <label>Campaña</label>
          <select value={campanaId} onChange={(e) => setCampanaId(e.target.value)}>
            <option value="">— elegir —</option>
            {campanas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} — {c.cultivo?.nombre}
                {c.estado !== "ACTIVA" ? ` (${c.estado.toLowerCase()})` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {campanaId && (
        <>
          <div className="field">
            <label>Registro</label>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <input type="radio" checked={modo === "nueva"} onChange={() => setModo("nueva")} />
                Nuevo
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <input type="radio" checked={modo === "existente"} onChange={() => setModo("existente")} />
                Vincular existente
              </label>
            </div>
          </div>

          {modo === "nueva" ? (
            <>
              <div className="field">
                <label>Fecha</label>
                <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </div>
              <div className="field">
                <label>{cfg.nombreLabel}</label>
                <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />
              </div>
              <div className="field">
                <label>{cfg.nivelLabel}</label>
                <select value={nivel} onChange={(e) => setNivel(e.target.value)}>
                  {NIVEL_INFESTACION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <div className="field">
              <label>{cfg.nombreLabel} ya cargada en esta campaña</label>
              <select value={registroId} onChange={(e) => setRegistroId(e.target.value)}>
                <option value="">— elegir —</option>
                {registrosSinUbicar.map((r) => (
                  <option key={r.id} value={r.id}>
                    {String(r[cfg.nombreField])} — {new Date(r.fecha).toLocaleDateString()}
                  </option>
                ))}
              </select>
              {registrosSinUbicar.length === 0 && (
                <p className="text-muted" style={{ fontSize: "0.8rem" }}>
                  Esta campaña no tiene registros cargados sin ubicar todavía.
                </p>
              )}
            </div>
          )}
        </>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
        <button className="btn secondary" onClick={onClose} type="button">
          Cancelar
        </button>
        <button className="btn" type="button" disabled={!puedeConfirmar} onClick={handleConfirm}>
          Guardar
        </button>
      </div>
    </Modal>
  );
}
