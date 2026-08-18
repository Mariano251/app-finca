import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useList } from "../../api/useCrud";
import { api } from "../../api/client";
import type { Incompatibilidad, PrincipioActivo } from "../../api/types";
import { MultiSelectPicker } from "../../components/MultiSelectPicker";

/**
 * Chequeo de mezcla (punto 32 del pedido): elegís 2+ principios activos y ves las
 * incompatibilidades DOCUMENTADAS entre ellos. Nunca muestra "compatible" para lo que no está
 * documentado — solo "no se encontró nada registrado", que es un dato distinto.
 */
export default function ChequeoMezcla() {
  const [params, setParams] = useSearchParams();
  const idsIniciales = (params.get("ids") ?? "").split(",").filter(Boolean).map(Number);
  const [seleccion, setSeleccion] = useState<number[]>(idsIniciales);

  const { data: opciones } = useList<PrincipioActivo>("/principios-activos");

  const { data: incompatibilidades } = useQuery<Incompatibilidad[]>({
    queryKey: ["/incompatibilidades/check", seleccion],
    queryFn: async () => (await api.get("/incompatibilidades/check", { params: { ids: seleccion.join(",") } })).data,
    enabled: seleccion.length >= 2,
  });

  function actualizarSeleccion(ids: number[]) {
    setSeleccion(ids);
    const next = new URLSearchParams(params);
    if (ids.length > 0) next.set("ids", ids.join(","));
    else next.delete("ids");
    setParams(next, { replace: true });
  }

  const nombrePorId = new Map((opciones ?? []).map((p) => [p.id, p.nombre]));

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/biblioteca" className="text-muted" style={{ fontSize: "0.85rem" }}>
            ← Biblioteca
          </Link>
          <h1>⚠️ Chequeo de mezcla</h1>
        </div>
      </div>

      <p className="text-muted">
        Elegí los principios activos que pensás mezclar en el tanque para ver si hay alguna incompatibilidad
        documentada entre ellos. La ausencia de un aviso NO significa que la mezcla sea compatible — solo que no hay
        nada cargado todavía en la Biblioteca.
      </p>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <MultiSelectPicker
          label="Elegí 2 o más principios activos"
          values={seleccion}
          onChange={actualizarSeleccion}
          options={(opciones ?? []).map((p) => ({ value: p.id, label: p.nombre }))}
        />
      </div>

      {seleccion.length < 2 && <p className="text-muted">Elegí al menos dos principios activos para chequear.</p>}

      {seleccion.length >= 2 && (
        <div className="card">
          {incompatibilidades && incompatibilidades.length > 0 ? (
            <ul style={{ paddingLeft: "1.1rem", margin: 0 }}>
              {incompatibilidades.map((i) => (
                <li key={i.id} style={{ marginBottom: "0.5rem", color: "var(--color-danger, #c0392b)" }}>
                  ⚠️ <strong>{nombrePorId.get(i.principioActivoAId) ?? i.principioActivoA?.nombre}</strong> no compatible
                  con <strong>{nombrePorId.get(i.principioActivoBId) ?? i.principioActivoB?.nombre}</strong>
                  {i.tipo && <span className="text-muted"> · {i.tipo}</span>}
                  {i.observacion && <div style={{ color: "inherit" }}>{i.observacion}</div>}
                  {i.fuente && <div className="text-muted" style={{ fontSize: "0.8rem" }}>Fuente: {i.fuente}</div>}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ margin: 0 }}>
              No se encontraron incompatibilidades documentadas en la fuente cargada entre los principios elegidos.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
