import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { useList } from "../api/useCrud";
import type { Cultivo, Cuadro } from "../api/types";
import { EntityPicker } from "../components/EntityPicker";

type Tab = "fitosanitarios" | "rendimiento" | "problemas";

interface AplicacionResultado {
  id: number;
  fecha: string;
  productoComercial: string;
  principioActivo: string | null;
  tipo: string;
  dosis: number | null;
  unidadDosis: string | null;
  problemaObjetivo: string | null;
  campana: { nombre: string; cultivo: { nombre: string }; cuadro: { nombre: string; id: number } };
}

interface RendimientoPorCuadro {
  cuadroId: number;
  cuadroNombre: string;
  finca: string;
  campanas: number;
  rendimientoPromedioPorHa: number | null;
  produccionTotal: number;
}

interface ProblemasCuadro {
  enfermedades: { id: number; nombre: string; fecha: string; campana: { nombre: string } }[];
  plagas: { id: number; nombre: string; fecha: string; campana: { nombre: string } }[];
  malezas: { id: number; especie: string; fecha: string; campana: { nombre: string } }[];
}

export default function Busqueda() {
  const [tab, setTab] = useState<Tab>("fitosanitarios");

  return (
    <div>
      <div className="page-header">
        <h1>Búsqueda y análisis</h1>
      </div>

      <div className="card" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
        <Link className="btn secondary small" to="/conocimiento">
          Buscar por enfermedad/plaga/maleza →
        </Link>
        <Link className="btn secondary small" to="/economia">
          Cultivo o cuadro más rentable →
        </Link>
      </div>

      <div className="tabs">
        <button className={"tab-btn" + (tab === "fitosanitarios" ? " active" : "")} onClick={() => setTab("fitosanitarios")}>
          Fitosanitarios usados
        </button>
        <button className={"tab-btn" + (tab === "rendimiento" ? " active" : "")} onClick={() => setTab("rendimiento")}>
          Rendimiento por cuadro
        </button>
        <button className={"tab-btn" + (tab === "problemas" ? " active" : "")} onClick={() => setTab("problemas")}>
          Problemas por cuadro
        </button>
      </div>

      {tab === "fitosanitarios" && <BuscarFitosanitarios />}
      {tab === "rendimiento" && <RendimientoPorCuadroTab />}
      {tab === "problemas" && <ProblemasPorCuadroTab />}
    </div>
  );
}

function BuscarFitosanitarios() {
  const { data: cultivos } = useList<Cultivo>("/cultivos");
  const { data: cuadros } = useList<Cuadro>("/cuadros");
  const [cultivoId, setCultivoId] = useState("");
  const [cuadroId, setCuadroId] = useState("");
  const [anio, setAnio] = useState("");

  const { data, isFetching } = useQuery<AplicacionResultado[]>({
    queryKey: ["/aplicaciones/buscar", cultivoId, cuadroId, anio],
    queryFn: async () =>
      (
        await api.get("/aplicaciones/buscar", {
          params: { cultivoId: cultivoId || undefined, cuadroId: cuadroId || undefined, anio: anio || undefined },
        })
      ).data,
  });

  return (
    <div>
      <div className="card">
        <div className="form-grid">
          <EntityPicker
            label="Cultivo"
            value={cultivoId}
            onChange={setCultivoId}
            options={(cultivos ?? []).map((c) => ({ value: String(c.id), label: c.nombre }))}
          />
          <EntityPicker
            label="Cuadro"
            value={cuadroId}
            onChange={setCuadroId}
            options={(cuadros ?? []).map((c) => ({ value: String(c.id), label: c.nombre }))}
          />
          <div className="field">
            <label>Año</label>
            <input type="number" value={anio} onChange={(e) => setAnio(e.target.value)} placeholder="2026" />
          </div>
        </div>
      </div>

      {isFetching && <p className="text-muted">Buscando…</p>}
      {!isFetching && (data?.length ?? 0) === 0 && <div className="card empty-state">Sin resultados.</div>}

      {(data?.length ?? 0) > 0 && (
        <div className="card table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Producto</th>
                <th>Tipo</th>
                <th>Dosis</th>
                <th>Problema objetivo</th>
                <th>Cultivo</th>
                <th>Cuadro</th>
              </tr>
            </thead>
            <tbody>
              {data!.map((a) => (
                <tr key={a.id}>
                  <td>{new Date(a.fecha).toLocaleDateString()}</td>
                  <td>{a.productoComercial}</td>
                  <td>{a.tipo}</td>
                  <td>{a.dosis != null ? `${a.dosis} ${a.unidadDosis ?? ""}` : "—"}</td>
                  <td>{a.problemaObjetivo ?? "—"}</td>
                  <td>{a.campana.cultivo.nombre}</td>
                  <td>
                    <Link to={`/cuadros/${a.campana.cuadro.id}`}>{a.campana.cuadro.nombre}</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RendimientoPorCuadroTab() {
  const [orden, setOrden] = useState<"asc" | "desc">("asc");
  const { data, isLoading } = useQuery<RendimientoPorCuadro[]>({
    queryKey: ["/rendimiento/por-cuadro"],
    queryFn: async () => (await api.get("/rendimiento/por-cuadro")).data,
  });

  const ordenado = [...(data ?? [])].sort((a, b) => {
    const av = a.rendimientoPromedioPorHa ?? 0;
    const bv = b.rendimientoPromedioPorHa ?? 0;
    return orden === "asc" ? av - bv : bv - av;
  });

  return (
    <div>
      <div className="card" style={{ display: "flex", gap: "0.5rem" }}>
        <button className={"btn small" + (orden === "asc" ? "" : " secondary")} onClick={() => setOrden("asc")}>
          Menor rendimiento primero
        </button>
        <button className={"btn small" + (orden === "desc" ? "" : " secondary")} onClick={() => setOrden("desc")}>
          Mayor rendimiento primero
        </button>
      </div>

      {isLoading && <p className="text-muted">Cargando…</p>}
      {!isLoading && ordenado.length === 0 && (
        <div className="card empty-state">Todavía no hay cosechas registradas.</div>
      )}

      {ordenado.length > 0 && (
        <div className="card table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Cuadro</th>
                <th>Finca</th>
                <th>Campañas</th>
                <th>Rendimiento promedio (kg/ha)</th>
                <th>Producción total (kg)</th>
              </tr>
            </thead>
            <tbody>
              {ordenado.map((r) => (
                <tr key={r.cuadroId}>
                  <td>
                    <Link to={`/cuadros/${r.cuadroId}`}>{r.cuadroNombre}</Link>
                  </td>
                  <td>{r.finca}</td>
                  <td>{r.campanas}</td>
                  <td>{r.rendimientoPromedioPorHa != null ? Math.round(r.rendimientoPromedioPorHa).toLocaleString("es-AR") : "—"}</td>
                  <td>{r.produccionTotal.toLocaleString("es-AR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ProblemasPorCuadroTab() {
  const { data: cuadros } = useList<Cuadro>("/cuadros");
  const [cuadroId, setCuadroId] = useState("");

  const { data, isFetching } = useQuery<ProblemasCuadro>({
    queryKey: [`/cuadros/${cuadroId}/problemas`],
    queryFn: async () => (await api.get(`/cuadros/${cuadroId}/problemas`)).data,
    enabled: !!cuadroId,
  });

  return (
    <div>
      <div className="card">
        <EntityPicker
          label="Cuadro"
          value={cuadroId}
          onChange={setCuadroId}
          options={(cuadros ?? []).map((c) => ({ value: String(c.id), label: c.nombre }))}
        />
      </div>

      {!cuadroId && <div className="card empty-state">Elegí un cuadro para ver su historial de problemas.</div>}
      {isFetching && <p className="text-muted">Cargando…</p>}

      {data && (
        <>
          <div className="card">
            <h3>Enfermedades</h3>
            {data.enfermedades.length === 0 && <p className="text-muted">Sin registros.</p>}
            {data.enfermedades.map((e) => (
              <p key={e.id} style={{ margin: "0.25rem 0" }}>
                {new Date(e.fecha).toLocaleDateString()} · {e.nombre} · {e.campana.nombre}
              </p>
            ))}
          </div>
          <div className="card">
            <h3>Plagas</h3>
            {data.plagas.length === 0 && <p className="text-muted">Sin registros.</p>}
            {data.plagas.map((p) => (
              <p key={p.id} style={{ margin: "0.25rem 0" }}>
                {new Date(p.fecha).toLocaleDateString()} · {p.nombre} · {p.campana.nombre}
              </p>
            ))}
          </div>
          <div className="card">
            <h3>Malezas</h3>
            {data.malezas.length === 0 && <p className="text-muted">Sin registros.</p>}
            {data.malezas.map((m) => (
              <p key={m.id} style={{ margin: "0.25rem 0" }}>
                {new Date(m.fecha).toLocaleDateString()} · {m.especie} · {m.campana.nombre}
              </p>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
