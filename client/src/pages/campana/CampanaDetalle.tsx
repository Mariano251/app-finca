import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useList, useOne, useUpdate } from "../../api/useCrud";
import type { Campana, Cultivo, Variedad } from "../../api/types";
import { Modal } from "../../components/Modal";
import { RecordForm } from "../../components/RecordForm";
import { buildCampanaFields } from "./campanaFields";
import { SUB_RECORD_CONFIGS } from "./subRecordConfig";
import { SubRecordTab } from "./SubRecordTab";

export default function CampanaDetalle() {
  const { campanaId } = useParams();
  const id = Number(campanaId);
  const { data: campana, isLoading } = useOne<Campana>("/campanas", id);
  const { data: cultivos } = useList<Cultivo>("/cultivos");
  const { data: variedades } = useList<Variedad>("/variedades");
  const update = useUpdate<Campana>("/campanas");
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState(0);

  if (isLoading) return <p className="text-muted">Cargando…</p>;
  if (!campana) return <div className="card empty-state">Campaña no encontrada.</div>;

  const cuadro = campana.cuadro;

  return (
    <div>
      <div className="page-header">
        <div>
          {cuadro && (
            <Link to={`/cuadros/${cuadro.id}`} className="text-muted" style={{ fontSize: "0.85rem" }}>
              ← {cuadro.nombre}
            </Link>
          )}
          <h1>{campana.nombre}</h1>
        </div>
        <button className="btn secondary" onClick={() => setEditing(true)}>
          Editar
        </button>
      </div>

      <div className="card">
        <div className="form-grid" style={{ rowGap: "0.4rem" }}>
          <div>
            <span className="text-muted">Cultivo: </span>
            {campana.cultivo?.nombre ?? "—"}
            {campana.variedad?.nombre ? ` (${campana.variedad.nombre})` : ""}
          </div>
          <div>
            <span className="text-muted">Estado: </span>
            <span className="tag">{campana.estado}</span>
          </div>
          <div>
            <span className="text-muted">Plantación: </span>
            {campana.fechaPlantacion ? new Date(campana.fechaPlantacion).toLocaleDateString() : "—"}
          </div>
          <div>
            <span className="text-muted">Cosecha estimada: </span>
            {campana.fechaCosechaEstimada ? new Date(campana.fechaCosechaEstimada).toLocaleDateString() : "—"}
          </div>
          <div>
            <span className="text-muted">Superficie: </span>
            {campana.superficieImplantada != null ? `${campana.superficieImplantada} ha` : "—"}
          </div>
        </div>
        {campana.notas && (
          <p style={{ marginTop: "0.5rem" }}>
            <span className="text-muted">Notas: </span>
            {campana.notas}
          </p>
        )}
      </div>

      <EconomiaResumen campana={campana} />

      <div className="tabs" style={{ marginTop: "1.25rem" }}>
        {SUB_RECORD_CONFIGS.map((cfg, i) => (
          <button
            key={cfg.path}
            className={"tab-btn" + (tab === i ? " active" : "")}
            onClick={() => setTab(i)}
            type="button"
          >
            {cfg.label}
          </button>
        ))}
      </div>

      <SubRecordTab campanaId={id} config={SUB_RECORD_CONFIGS[tab]} />

      {editing && (
        <Modal title="Editar campaña" onClose={() => setEditing(false)}>
          <RecordForm
            fields={buildCampanaFields(cultivos ?? [], variedades ?? [])}
            initial={{
              ...campana,
              cultivoId: String(campana.cultivoId),
              variedadId: campana.variedadId ? String(campana.variedadId) : "",
            }}
            submitting={update.isPending}
            onCancel={() => setEditing(false)}
            onSubmit={(data) => {
              const payload = {
                ...data,
                cultivoId: Number(data.cultivoId),
                variedadId: data.variedadId ? Number(data.variedadId) : null,
              };
              update.mutate({ id: campana.id, data: payload }, { onSuccess: () => setEditing(false) });
            }}
          />
        </Modal>
      )}
    </div>
  );
}

const money = (n: number) => n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

function EconomiaResumen({ campana }: { campana: Campana }) {
  const costoTotal = (campana.costos ?? []).reduce((s, c) => s + c.monto, 0);
  const ingresoTotal = (campana.ventas ?? []).reduce((s, v) => s + v.ingresoTotal, 0);
  const produccionTotal = (campana.cosechas ?? []).reduce((s, c) => s + (c.produccionTotal ?? 0), 0);
  const margenBruto = ingresoTotal - costoTotal;
  const superficie = campana.superficieImplantada ?? 0;

  if (costoTotal === 0 && ingresoTotal === 0) return null;

  return (
    <div className="grid grid-stats" style={{ marginTop: "0.75rem" }}>
      <div className="stat-card">
        <div className="value">{money(costoTotal)}</div>
        <div className="label">Costo total{superficie ? ` (${money(costoTotal / superficie)}/ha)` : ""}</div>
      </div>
      <div className="stat-card">
        <div className="value">{money(ingresoTotal)}</div>
        <div className="label">Ingreso total</div>
      </div>
      <div className="stat-card">
        <div className="value">{money(margenBruto)}</div>
        <div className="label">Margen bruto{superficie ? ` (${money(margenBruto / superficie)}/ha)` : ""}</div>
      </div>
      {produccionTotal > 0 && (
        <div className="stat-card">
          <div className="value">{money(costoTotal / produccionTotal)}</div>
          <div className="label">Costo por kg</div>
        </div>
      )}
    </div>
  );
}
