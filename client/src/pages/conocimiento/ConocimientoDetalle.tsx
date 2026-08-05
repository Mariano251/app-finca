import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";

interface ProblemaDetalle {
  tipo: string;
  nombre: string;
  ocurrencias: number;
  cultivosAfectados: string[];
  cuadrosAfectados: { id: number; nombre: string }[];
  campanasAfectadas: { id: number; nombre: string }[];
  niveles: string[];
  productosUtilizados: string[];
  resultados: { campanaId: number; campanaNombre: string; cuadro: string; anio: number | null; rendimientoPorHa: number | null }[];
}

export default function ConocimientoDetalle() {
  const { tipo, nombre } = useParams();
  const { data, isLoading } = useQuery<ProblemaDetalle>({
    queryKey: ["/conocimiento/problemas", tipo, nombre],
    queryFn: async () =>
      (await api.get("/conocimiento/problemas", { params: { tipo, nombre } })).data,
    enabled: !!tipo && !!nombre,
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/conocimiento" className="text-muted" style={{ fontSize: "0.85rem" }}>
            ← Base de conocimiento
          </Link>
          <h1>{nombre}</h1>
        </div>
      </div>

      {isLoading && <p className="text-muted">Cargando…</p>}
      {!isLoading && data && (
        <>
          <div className="grid grid-stats">
            <div className="stat-card">
              <div className="value">{data.ocurrencias}</div>
              <div className="label">Registros</div>
            </div>
            <div className="stat-card">
              <div className="value">{data.cuadrosAfectados.length}</div>
              <div className="label">Cuadros afectados</div>
            </div>
            <div className="stat-card">
              <div className="value">{data.campanasAfectadas.length}</div>
              <div className="label">Campañas</div>
            </div>
          </div>

          <div className="card">
            <h3>Cultivos afectados</h3>
            <p>{data.cultivosAfectados.join(", ") || "—"}</p>

            <h3>Cuadros donde apareció</h3>
            <p>
              {data.cuadrosAfectados.length > 0
                ? data.cuadrosAfectados.map((c, i) => (
                    <span key={c.id}>
                      {i > 0 && ", "}
                      <Link to={`/cuadros/${c.id}`}>{c.nombre}</Link>
                    </span>
                  ))
                : "—"}
            </p>

            <h3>Niveles registrados</h3>
            <p>{data.niveles.join(", ") || "—"}</p>

            <h3>Productos utilizados en esas campañas</h3>
            <p>{data.productosUtilizados.join(", ") || "Sin aplicaciones fitosanitarias registradas"}</p>
          </div>

          <div className="page-header" style={{ marginTop: "1.25rem" }}>
            <h2>Resultados obtenidos</h2>
          </div>
          <div className="card table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Año</th>
                  <th>Cuadro</th>
                  <th>Campaña</th>
                  <th>Rendimiento (kg/ha)</th>
                </tr>
              </thead>
              <tbody>
                {data.resultados.map((r) => (
                  <tr key={r.campanaId}>
                    <td>{r.anio ?? "—"}</td>
                    <td>{r.cuadro}</td>
                    <td>{r.campanaNombre}</td>
                    <td>{r.rendimientoPorHa != null ? Math.round(r.rendimientoPorHa).toLocaleString("es-AR") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
