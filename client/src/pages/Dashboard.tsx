import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

interface DashboardData {
  superficieTotal: number;
  superficiePorCultivo: { cultivo: string; superficie: number }[];
  cultivosImplantados: string[];
  campanasActivas: { id: number; nombre: string; cultivo: string; cuadro: string; cuadroId: number }[];
  produccionTotal: number;
  costoTotal: number;
  ingresoTotal: number;
  rentabilidad: number;
  alertas: {
    aplicacionesPendientes: { id: number; producto: string; fecha: string; cuadro: string; cuadroId: number }[];
    proximasLabores: { id: number; tipo: string; descripcion: string | null; fecha: string; cuadro: string; cuadroId: number }[];
    cosechasProximas: { campanaId: number; campanaNombre: string; fechaCosechaEstimada: string }[];
    problemasRecientes: { tipo: string; nombre: string; fecha: string; cuadro: string; cuadroId: number }[];
    cuadrosConProblemasRecurrentes: { cuadroId: number; cuadro: string; nombre: string; campanas: number }[];
    tareasAtrasadas: { tipo: string; id: number; descripcion: string; fecha: string; cuadro: string }[];
    insumosStockBajo: { id: number; nombre: string; stockActual: number; stockMinimo: number; unidad: string }[];
  };
}

const money = (n: number) => n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export default function Dashboard() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["/dashboard"],
    queryFn: async () => (await api.get("/dashboard")).data,
  });

  if (isLoading || !data) return <p className="text-muted">Cargando…</p>;

  const { alertas } = data;
  const totalAlertas =
    alertas.aplicacionesPendientes.length +
    alertas.cosechasProximas.length +
    alertas.tareasAtrasadas.length +
    alertas.cuadrosConProblemasRecurrentes.length +
    alertas.insumosStockBajo.length;

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>

      <div className="grid grid-stats">
        <div className="stat-card">
          <div className="value">{data.superficieTotal.toFixed(1)}</div>
          <div className="label">Superficie total (ha)</div>
        </div>
        <div className="stat-card">
          <div className="value">{data.cultivosImplantados.length}</div>
          <div className="label">Cultivos implantados</div>
        </div>
        <div className="stat-card">
          <div className="value">{data.campanasActivas.length}</div>
          <div className="label">Campañas activas</div>
        </div>
        <div className="stat-card">
          <div className="value">{data.produccionTotal.toLocaleString("es-AR")}</div>
          <div className="label">Producción total (kg)</div>
        </div>
        <div className="stat-card">
          <div className="value" style={{ color: data.rentabilidad >= 0 ? "var(--color-primary-dark)" : "var(--color-danger)" }}>
            {money(data.rentabilidad)}
          </div>
          <div className="label">Rentabilidad acumulada</div>
        </div>
      </div>

      {data.superficiePorCultivo.length > 0 && (
        <div className="card" style={{ marginTop: "0.75rem" }}>
          <h3>Superficie por cultivo</h3>
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            {data.superficiePorCultivo.map((s) => (
              <span key={s.cultivo} className="tag">
                {s.cultivo}: {s.superficie.toFixed(1)} ha
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="page-header" style={{ marginTop: "1.25rem" }}>
        <h2>Alertas {totalAlertas > 0 && <span className="tag">{totalAlertas}</span>}</h2>
      </div>

      {totalAlertas === 0 ? (
        <div className="card empty-state">Sin alertas pendientes por ahora.</div>
      ) : (
        <>
          {alertas.tareasAtrasadas.length > 0 && (
            <div className="card">
              <h3 style={{ color: "var(--color-danger)" }}>⚠️ Tareas atrasadas</h3>
              {alertas.tareasAtrasadas.map((t) => (
                <p key={`${t.tipo}-${t.id}`} style={{ margin: "0.25rem 0" }}>
                  {new Date(t.fecha).toLocaleDateString()} · {t.descripcion} · {t.cuadro}
                </p>
              ))}
            </div>
          )}

          {alertas.aplicacionesPendientes.length > 0 && (
            <div className="card">
              <h3>🧪 Aplicaciones pendientes</h3>
              {alertas.aplicacionesPendientes.map((a) => (
                <p key={a.id} style={{ margin: "0.25rem 0" }}>
                  <Link to={`/cuadros/${a.cuadroId}`}>{a.cuadro}</Link> · {a.producto} ·{" "}
                  {new Date(a.fecha).toLocaleDateString()}
                </p>
              ))}
            </div>
          )}

          {alertas.proximasLabores.length > 0 && (
            <div className="card">
              <h3>📅 Labores próximas (14 días)</h3>
              {alertas.proximasLabores.map((l) => (
                <p key={l.id} style={{ margin: "0.25rem 0" }}>
                  <Link to={`/cuadros/${l.cuadroId}`}>{l.cuadro}</Link> · {l.descripcion ?? l.tipo} ·{" "}
                  {new Date(l.fecha).toLocaleDateString()}
                </p>
              ))}
            </div>
          )}

          {alertas.cosechasProximas.length > 0 && (
            <div className="card">
              <h3>🌾 Cosechas próximas</h3>
              {alertas.cosechasProximas.map((c) => (
                <p key={c.campanaId} style={{ margin: "0.25rem 0" }}>
                  {c.campanaNombre} · {new Date(c.fechaCosechaEstimada).toLocaleDateString()}
                </p>
              ))}
            </div>
          )}

          {alertas.cuadrosConProblemasRecurrentes.length > 0 && (
            <div className="card">
              <h3>🔁 Cuadros con problemas recurrentes</h3>
              {alertas.cuadrosConProblemasRecurrentes.map((c) => (
                <p key={`${c.cuadroId}-${c.nombre}`} style={{ margin: "0.25rem 0" }}>
                  <Link to={`/cuadros/${c.cuadroId}`}>{c.cuadro}</Link> · {c.nombre} en {c.campanas} campañas
                </p>
              ))}
            </div>
          )}

          {alertas.insumosStockBajo.length > 0 && (
            <div className="card">
              <h3>📦 Insumos con stock bajo</h3>
              {alertas.insumosStockBajo.map((i) => (
                <p key={i.id} style={{ margin: "0.25rem 0" }}>
                  <Link to={`/stock/${i.id}`}>{i.nombre}</Link> · {i.stockActual} {i.unidad} (mínimo {i.stockMinimo} {i.unidad})
                </p>
              ))}
            </div>
          )}
        </>
      )}

      {alertas.problemasRecientes.length > 0 && (
        <>
          <div className="page-header" style={{ marginTop: "1.25rem" }}>
            <h2>Problemas sanitarios recientes</h2>
          </div>
          <div className="card">
            {alertas.problemasRecientes.map((p, i) => (
              <p key={i} style={{ margin: "0.25rem 0" }}>
                {new Date(p.fecha).toLocaleDateString()} · <span className="tag">{p.tipo}</span> {p.nombre} ·{" "}
                <Link to={`/cuadros/${p.cuadroId}`}>{p.cuadro}</Link>
              </p>
            ))}
          </div>
        </>
      )}

      <div className="card" style={{ marginTop: "1.25rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <Link className="btn secondary" to="/stock">
          📦 Stock de insumos
        </Link>
        <Link className="btn secondary" to="/economia">
          💰 Rentabilidad por cultivo y cuadro
        </Link>
        <Link className="btn secondary" to="/conocimiento">
          📘 Base de conocimiento agronómico
        </Link>
        <Link className="btn secondary" to="/busqueda">
          🔍 Búsqueda avanzada
        </Link>
      </div>
    </div>
  );
}
