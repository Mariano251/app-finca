import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useList } from "../../api/useCrud";
import { api } from "../../api/client";
import { useQuery } from "@tanstack/react-query";
import type { PrincipioActivo } from "../../api/types";
import { TIPO_FITOSANITARIO_OPTIONS, MOVILIDAD_OPTIONS, TIPO_ORGANISMO_OPTIONS } from "../../constants";
import { MultiSelectPicker } from "../../components/MultiSelectPicker";

function labelFor(options: { value: string; label: string }[], value?: string | null) {
  return options.find((o) => o.value === value)?.label ?? value ?? "—";
}

/**
 * Comparador de principios activos (punto 7) + aviso de grupo de acción compartido (punto 8):
 * el aviso se calcula acá mismo, en el cliente, porque ya tenemos la ficha completa de cada uno
 * — no hace falta un endpoint aparte para "¿comparten grupo?".
 */
export default function Comparador() {
  const [params, setParams] = useSearchParams();
  const idsIniciales = (params.get("ids") ?? "").split(",").filter(Boolean).map(Number);
  const [seleccion, setSeleccion] = useState<number[]>(idsIniciales);

  const { data: opciones } = useList<PrincipioActivo>("/principios-activos");

  const { data: comparados } = useQuery<PrincipioActivo[]>({
    queryKey: ["/principios-activos/comparar", seleccion],
    queryFn: async () => (await api.get("/principios-activos/comparar", { params: { ids: seleccion.join(",") } })).data,
    enabled: seleccion.length >= 2,
  });

  const gruposCompartidos = useMemo(() => {
    if (!comparados) return new Set<string>();
    const conteo = new Map<string, number>();
    for (const p of comparados) {
      if (!p.grupoAccion) continue;
      conteo.set(p.grupoAccion, (conteo.get(p.grupoAccion) ?? 0) + 1);
    }
    return new Set(Array.from(conteo.entries()).filter(([, n]) => n > 1).map(([g]) => g));
  }, [comparados]);

  function actualizarSeleccion(ids: number[]) {
    setSeleccion(ids);
    const next = new URLSearchParams(params);
    if (ids.length > 0) next.set("ids", ids.join(","));
    else next.delete("ids");
    setParams(next, { replace: true });
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/biblioteca" className="text-muted" style={{ fontSize: "0.85rem" }}>
            ← Biblioteca
          </Link>
          <h1>⚖️ Comparar principios activos</h1>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <MultiSelectPicker
          label="Elegí 2 o más principios activos"
          values={seleccion}
          onChange={actualizarSeleccion}
          options={(opciones ?? []).map((p) => ({ value: p.id, label: p.nombre }))}
        />
      </div>

      {seleccion.length < 2 && <p className="text-muted">Elegí al menos dos principios activos para comparar.</p>}

      {gruposCompartidos.size > 0 && (
        <div className="card" style={{ marginBottom: "1rem", borderColor: "var(--color-warning)" }}>
          ⚠️ {Array.from(gruposCompartidos).length === 1 ? "Hay principios activos" : "Hay grupos"} que comparten grupo de
          acción/resistencia ({Array.from(gruposCompartidos).join(", ")}) — considerá evaluar alternativas de otro grupo
          para el manejo de resistencia. Esto es informativo: no reemplaza la etiqueta ni la evaluación profesional.
        </div>
      )}

      {comparados && comparados.length >= 2 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>—</th>
                {comparados.map((p) => (
                  <th key={p.id}>
                    <Link to={`/biblioteca/principios-activos/${p.id}`}>{p.nombre}</Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Tipo</td>
                {comparados.map((p) => (
                  <td key={p.id}>{labelFor(TIPO_FITOSANITARIO_OPTIONS, p.tipo)}</td>
                ))}
              </tr>
              <tr>
                <td>Movilidad</td>
                {comparados.map((p) => (
                  <td key={p.id}>{labelFor(MOVILIDAD_OPTIONS, p.movilidad)}</td>
                ))}
              </tr>
              <tr>
                <td>Grupo de acción</td>
                {comparados.map((p) => (
                  <td key={p.id} style={p.grupoAccion && gruposCompartidos.has(p.grupoAccion) ? { color: "var(--color-warning)", fontWeight: 600 } : undefined}>
                    {p.grupoAccion || "—"}
                  </td>
                ))}
              </tr>
              <tr>
                <td>Plagas/objetivos</td>
                {comparados.map((p) => (
                  <td key={p.id}>
                    {(p.organismos ?? []).length > 0
                      ? p.organismos!.map((o) => `${o.nombre} (${labelFor(TIPO_ORGANISMO_OPTIONS, o.tipo)})`).join(", ")
                      : "—"}
                  </td>
                ))}
              </tr>
              <tr>
                <td>Cultivos</td>
                {comparados.map((p) => (
                  <td key={p.id}>{(p.cultivos ?? []).map((c) => c.nombre).join(", ") || "—"}</td>
                ))}
              </tr>
              <tr>
                <td>Observaciones</td>
                {comparados.map((p) => (
                  <td key={p.id}>{p.observaciones || "—"}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
