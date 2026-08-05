import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useCreate, useDelete, useList, useOne, useUpdate } from "../../api/useCrud";
import type { Campana, Cuadro, Cultivo, Variedad } from "../../api/types";
import { Modal } from "../../components/Modal";
import { RecordForm, type FieldSchema } from "../../components/RecordForm";
import { RecordList } from "../../components/RecordList";
import { RIEGO_OPTIONS } from "../../constants";
import { buildCampanaFields } from "../campana/campanaFields";
import { YieldComparisonChart } from "../../components/YieldComparisonChart";

interface RendimientoPunto {
  campanaId: number;
  campanaNombre: string;
  cultivo: string;
  anio: number | null;
  rendimientoPorHa: number | null;
}

const cuadroFields: FieldSchema[] = [
  { name: "nombre", label: "Nombre / número", type: "text", required: true },
  { name: "superficie", label: "Superficie (ha)", type: "number", step: "0.01" },
  { name: "ubicacion", label: "Ubicación", type: "text" },
  { name: "tipoSuelo", label: "Tipo de suelo", type: "text" },
  { name: "sistemaRiego", label: "Sistema de riego", type: "select", options: RIEGO_OPTIONS },
  { name: "caracteristicasSuelo", label: "Características del suelo", type: "textarea", fullWidth: true },
  { name: "activo", label: "Activo", type: "checkbox" },
  { name: "notas", label: "Notas", type: "textarea", fullWidth: true },
];

export default function CuadroDetalle() {
  const { id } = useParams();
  const cuadroId = Number(id);
  const navigate = useNavigate();
  const { data: cuadro, isLoading } = useOne<Cuadro>("/cuadros", cuadroId);
  const update = useUpdate<Cuadro>("/cuadros", ["/cuadros", "/fincas"]);
  const del = useDelete("/cuadros", ["/cuadros", "/fincas"]);
  const [editing, setEditing] = useState(false);

  const { data: cultivos } = useList<Cultivo>("/cultivos");
  const { data: variedades } = useList<Variedad>("/variedades");
  const createCampana = useCreate<Campana>("/campanas", ["/campanas", "/cuadros"]);
  const [newCampana, setNewCampana] = useState(false);

  const { data: rendimiento } = useList<RendimientoPunto>(`/cuadros/${cuadroId}/rendimiento-historico`);

  if (isLoading) return <p className="text-muted">Cargando…</p>;
  if (!cuadro) return <div className="card empty-state">Cuadro no encontrado.</div>;

  const finca = cuadro.sector?.finca;

  return (
    <div>
      <div className="page-header">
        <div>
          {finca && (
            <Link to={`/finca/${finca.id}`} className="text-muted" style={{ fontSize: "0.85rem" }}>
              ← {finca.nombre} / {cuadro.sector?.nombre}
            </Link>
          )}
          <h1>{cuadro.nombre}</h1>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {finca && (
            <Link className="btn secondary" to={`/finca/${finca.id}/croquis`}>
              🗺️ Ver en croquis
            </Link>
          )}
          <button className="btn secondary" onClick={() => setEditing(true)}>
            Editar
          </button>
        </div>
      </div>

      <div className="card">
        <div className="form-grid" style={{ rowGap: "0.4rem" }}>
          <div>
            <span className="text-muted">Superficie: </span>
            {cuadro.superficie != null ? `${cuadro.superficie} ha` : "—"}
          </div>
          <div>
            <span className="text-muted">Riego: </span>
            {RIEGO_OPTIONS.find((o) => o.value === cuadro.sistemaRiego)?.label ?? "—"}
          </div>
          <div>
            <span className="text-muted">Ubicación: </span>
            {cuadro.ubicacion ?? "—"}
          </div>
          <div>
            <span className="text-muted">Tipo de suelo: </span>
            {cuadro.tipoSuelo ?? "—"}
          </div>
          <div>
            <span className="text-muted">Estado: </span>
            <span className="tag">{cuadro.activo ? "Activo" : "Inactivo"}</span>
          </div>
        </div>
        {cuadro.caracteristicasSuelo && (
          <p style={{ marginTop: "0.5rem" }}>
            <span className="text-muted">Suelo: </span>
            {cuadro.caracteristicasSuelo}
          </p>
        )}
        {cuadro.notas && (
          <p>
            <span className="text-muted">Notas: </span>
            {cuadro.notas}
          </p>
        )}
        <button
          className="btn danger small"
          style={{ marginTop: "0.5rem" }}
          onClick={() => {
            if (confirm(`¿Borrar el cuadro "${cuadro.nombre}" y todo su historial?`)) {
              del.mutate(cuadro.id, { onSuccess: () => finca && navigate(`/finca/${finca.id}`) });
            }
          }}
        >
          Borrar cuadro
        </button>
      </div>

      <div className="page-header" style={{ marginTop: "1.25rem" }}>
        <h2>Campañas</h2>
        <button className="btn small" onClick={() => setNewCampana(true)}>
          + Nueva campaña
        </button>
      </div>
      <div className="card">
        <RecordList<Campana>
          items={cuadro.campanas}
          emptyMessage="Todavía no hay campañas registradas en este cuadro."
          onRowClick={(c) => navigate(`/cuadros/${cuadro.id}/campanas/${c.id}`)}
          columns={[
            { key: "nombre", label: "Campaña" },
            { key: "cultivo", label: "Cultivo", render: (c) => c.cultivo?.nombre ?? "—" },
            { key: "estado", label: "Estado", render: (c) => <span className="tag">{c.estado}</span> },
            {
              key: "fechaPlantacion",
              label: "Plantación",
              render: (c) => (c.fechaPlantacion ? new Date(c.fechaPlantacion).toLocaleDateString() : "—"),
            },
          ]}
        />
      </div>

      <div className="page-header" style={{ marginTop: "1.25rem" }}>
        <h2>Historial de rendimiento</h2>
      </div>
      <div className="card">
        <YieldComparisonChart
          data={(rendimiento ?? []).map((r) => ({
            label: `${r.anio ?? "?"} · ${r.cultivo}`,
            rendimientoPorHa: r.rendimientoPorHa,
          }))}
        />
        {(rendimiento?.length ?? 0) > 0 && (
          <div className="table-wrap" style={{ marginTop: "0.75rem" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Año</th>
                  <th>Cultivo</th>
                  <th>Campaña</th>
                  <th>Rendimiento (kg/ha)</th>
                </tr>
              </thead>
              <tbody>
                {rendimiento!.map((r) => (
                  <tr
                    key={r.campanaId}
                    style={{ cursor: "pointer" }}
                    onClick={() => navigate(`/cuadros/${cuadro.id}/campanas/${r.campanaId}`)}
                  >
                    <td>{r.anio ?? "—"}</td>
                    <td>{r.cultivo}</td>
                    <td>{r.campanaNombre}</td>
                    <td>{r.rendimientoPorHa != null ? Math.round(r.rendimientoPorHa).toLocaleString("es-AR") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <Modal title="Editar cuadro" onClose={() => setEditing(false)}>
          <RecordForm
            fields={cuadroFields}
            initial={cuadro}
            submitting={update.isPending}
            onCancel={() => setEditing(false)}
            onSubmit={(data) => update.mutate({ id: cuadro.id, data }, { onSuccess: () => setEditing(false) })}
          />
        </Modal>
      )}

      {newCampana && (
        <Modal title="Nueva campaña" onClose={() => setNewCampana(false)}>
          <RecordForm
            fields={buildCampanaFields(cultivos ?? [], variedades ?? [])}
            submitting={createCampana.isPending}
            onCancel={() => setNewCampana(false)}
            onSubmit={(data) => {
              const payload = {
                ...data,
                cuadroId: cuadro.id,
                cultivoId: Number(data.cultivoId),
                variedadId: data.variedadId ? Number(data.variedadId) : null,
              };
              createCampana.mutate(payload as Partial<Campana>, {
                onSuccess: (c: Campana) => {
                  setNewCampana(false);
                  navigate(`/cuadros/${cuadro.id}/campanas/${c.id}`);
                },
              });
            }}
          />
        </Modal>
      )}
    </div>
  );
}
