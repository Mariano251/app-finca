import { Link, useParams } from "react-router-dom";
import { useList, useOne } from "../../api/useCrud";
import type { Cultivo } from "../../api/types";
import { YieldComparisonChart } from "../../components/YieldComparisonChart";

interface HistorialItem {
  campanaId: number;
  campanaNombre: string;
  cuadroId: number;
  cuadro: string;
  finca: string;
  superficie: number | null;
  variedad: string | null;
  anio: number | null;
  estado: string;
  produccionTotal: number;
  rendimientoPorHa: number | null;
  calidad: string | null;
  enfermedades: string[];
  plagas: string[];
  malezas: string[];
  productosFitosanitarios: string[];
  costoTotal: number;
  ingresoTotal: number;
  margenBruto: number;
}

const money = (n: number) => n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export default function CultivoDetalle() {
  const { id } = useParams();
  const cultivoId = Number(id);
  const { data: cultivo } = useOne<Cultivo>("/cultivos", cultivoId);
  const { data: historial, isLoading } = useList<HistorialItem>(`/cultivos/${cultivoId}/historial`);

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/cultivos" className="text-muted" style={{ fontSize: "0.85rem" }}>
            ← Cultivos
          </Link>
          <h1>{cultivo?.nombre ?? "Cultivo"}</h1>
        </div>
      </div>

      <div className="card">
        <h3>Rendimiento por campaña</h3>
        <YieldComparisonChart
          data={(historial ?? []).map((h) => ({
            label: `${h.anio ?? "?"} · ${h.cuadro}`,
            rendimientoPorHa: h.rendimientoPorHa,
          }))}
        />
      </div>

      <div className="page-header" style={{ marginTop: "1.25rem" }}>
        <h2>Campañas</h2>
      </div>

      {isLoading && <p className="text-muted">Cargando…</p>}
      {!isLoading && (historial?.length ?? 0) === 0 && (
        <div className="card empty-state">Todavía no hay campañas registradas para este cultivo.</div>
      )}

      {(historial?.length ?? 0) > 0 && (
        <div className="card table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Año</th>
                <th>Cuadro</th>
                <th>Variedad</th>
                <th>Superficie</th>
                <th>Rendimiento (kg/ha)</th>
                <th>Producción (kg)</th>
                <th>Calidad</th>
                <th>Enfermedades</th>
                <th>Plagas</th>
                <th>Malezas</th>
                <th>Fitosanitarios</th>
                <th>Costo</th>
                <th>Ingreso</th>
                <th>Margen</th>
              </tr>
            </thead>
            <tbody>
              {historial!.map((h) => (
                <tr key={h.campanaId}>
                  <td>{h.anio ?? "—"}</td>
                  <td>
                    <Link to={`/cuadros/${h.cuadroId}/campanas/${h.campanaId}`}>{h.cuadro}</Link>
                  </td>
                  <td>{h.variedad ?? "—"}</td>
                  <td>{h.superficie != null ? `${h.superficie} ha` : "—"}</td>
                  <td>{h.rendimientoPorHa != null ? Math.round(h.rendimientoPorHa).toLocaleString("es-AR") : "—"}</td>
                  <td>{h.produccionTotal ? h.produccionTotal.toLocaleString("es-AR") : "—"}</td>
                  <td>{h.calidad ?? "—"}</td>
                  <td>{h.enfermedades.join(", ") || "—"}</td>
                  <td>{h.plagas.join(", ") || "—"}</td>
                  <td>{h.malezas.join(", ") || "—"}</td>
                  <td>{h.productosFitosanitarios.join(", ") || "—"}</td>
                  <td>{h.costoTotal ? money(h.costoTotal) : "—"}</td>
                  <td>{h.ingresoTotal ? money(h.ingresoTotal) : "—"}</td>
                  <td>{h.costoTotal || h.ingresoTotal ? money(h.margenBruto) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
