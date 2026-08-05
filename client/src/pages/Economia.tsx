import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

interface RankingItem {
  id: number;
  nombre: string;
  superficieImplantada: number;
  costoTotal: number;
  ingresoTotal: number;
  produccionTotal: number;
  campanas: number;
  margenBruto: number;
  costoPorHa: number | null;
  resultadoPorHa: number | null;
  costoPorKg: number | null;
}

const money = (n: number) => n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export default function Economia() {
  const [groupBy, setGroupBy] = useState<"cultivo" | "cuadro">("cultivo");
  const { data, isLoading } = useQuery<{ groupBy: string; ranking: RankingItem[] }>({
    queryKey: ["/economia/rentabilidad", groupBy],
    queryFn: async () => (await api.get("/economia/rentabilidad", { params: { groupBy } })).data,
  });

  return (
    <div>
      <div className="page-header">
        <h1>Economía y rentabilidad</h1>
      </div>

      <div className="tabs">
        <button className={"tab-btn" + (groupBy === "cultivo" ? " active" : "")} onClick={() => setGroupBy("cultivo")}>
          Por cultivo
        </button>
        <button className={"tab-btn" + (groupBy === "cuadro" ? " active" : "")} onClick={() => setGroupBy("cuadro")}>
          Por cuadro
        </button>
      </div>

      {isLoading && <p className="text-muted">Cargando…</p>}
      {!isLoading && (data?.ranking.length ?? 0) === 0 && (
        <div className="card empty-state">
          Todavía no hay costos ni ventas cargados para calcular rentabilidad.
        </div>
      )}

      {(data?.ranking.length ?? 0) > 0 && (
        <div className="card table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{groupBy === "cultivo" ? "Cultivo" : "Cuadro"}</th>
                <th>Campañas</th>
                <th>Superficie (ha)</th>
                <th>Costo total</th>
                <th>Ingreso total</th>
                <th>Margen bruto</th>
                <th>Resultado / ha</th>
                <th>Costo / kg</th>
              </tr>
            </thead>
            <tbody>
              {data!.ranking.map((r) => (
                <tr key={r.id}>
                  <td>
                    {groupBy === "cultivo" ? (
                      <Link to={`/cultivos/${r.id}`}>{r.nombre}</Link>
                    ) : (
                      <Link to={`/cuadros/${r.id}`}>{r.nombre}</Link>
                    )}
                  </td>
                  <td>{r.campanas}</td>
                  <td>{r.superficieImplantada.toFixed(1)}</td>
                  <td>{money(r.costoTotal)}</td>
                  <td>{money(r.ingresoTotal)}</td>
                  <td style={{ color: r.margenBruto >= 0 ? "var(--color-primary-dark)" : "var(--color-danger)" }}>
                    {money(r.margenBruto)}
                  </td>
                  <td>{r.resultadoPorHa != null ? money(r.resultadoPorHa) : "—"}</td>
                  <td>{r.costoPorKg != null ? money(r.costoPorKg) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
