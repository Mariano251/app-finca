import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useCreate, useDelete, useOne, useUpdate } from "../../api/useCrud";
import type { Cuadro, Finca, Sector } from "../../api/types";
import { Modal } from "../../components/Modal";
import { RecordForm, type FieldSchema } from "../../components/RecordForm";
import { RecordList } from "../../components/RecordList";
import { RIEGO_OPTIONS } from "../../constants";
import { ClimaCard } from "./ClimaCard";

const fincaFields: FieldSchema[] = [
  { name: "nombre", label: "Nombre", type: "text", required: true },
  { name: "ubicacion", label: "Ubicación", type: "text" },
  { name: "superficieTotal", label: "Superficie total (ha)", type: "number", step: "0.01" },
  {
    name: "latitud",
    label: "Latitud",
    type: "number",
    step: "0.000001",
    placeholder: "Para el clima — o usá el botón de ubicación en la ficha",
  },
  { name: "longitud", label: "Longitud", type: "number", step: "0.000001" },
  { name: "notas", label: "Notas", type: "textarea", fullWidth: true },
];

const sectorFields: FieldSchema[] = [
  { name: "nombre", label: "Nombre", type: "text", required: true },
  { name: "descripcion", label: "Descripción", type: "textarea", fullWidth: true },
];

const cuadroFields: FieldSchema[] = [
  { name: "nombre", label: "Nombre / número", type: "text", required: true },
  { name: "superficie", label: "Superficie (ha)", type: "number", step: "0.01" },
  { name: "ubicacion", label: "Ubicación", type: "text" },
  { name: "tipoSuelo", label: "Tipo de suelo", type: "text" },
  { name: "sistemaRiego", label: "Sistema de riego", type: "select", options: RIEGO_OPTIONS },
  { name: "caracteristicasSuelo", label: "Características del suelo", type: "textarea", fullWidth: true },
  { name: "notas", label: "Notas", type: "textarea", fullWidth: true },
];

export default function FincaDetalle() {
  const { id } = useParams();
  const fincaId = Number(id);
  const navigate = useNavigate();
  const { data: finca, isLoading } = useOne<Finca>("/fincas", fincaId);

  const updateFinca = useUpdate<Finca>("/fincas");
  const deleteFinca = useDelete("/fincas");
  const [editFinca, setEditFinca] = useState(false);

  const createSector = useCreate<Sector>("/sectores", ["/sectores", "/fincas"]);
  const updateSector = useUpdate<Sector>("/sectores", ["/sectores", "/fincas"]);
  const deleteSector = useDelete("/sectores", ["/sectores", "/fincas"]);
  const [sectorModal, setSectorModal] = useState<{ mode: "create" | "edit"; sector?: Sector } | null>(null);

  const createCuadro = useCreate<Cuadro>("/cuadros", ["/cuadros", "/fincas"]);
  const updateCuadro = useUpdate<Cuadro>("/cuadros", ["/cuadros", "/fincas"]);
  const deleteCuadro = useDelete("/cuadros", ["/cuadros", "/fincas"]);
  const [cuadroModal, setCuadroModal] = useState<{ mode: "create" | "edit"; sectorId: number; cuadro?: Cuadro } | null>(
    null
  );

  if (isLoading) return <p className="text-muted">Cargando…</p>;
  if (!finca) return <div className="card empty-state">Finca no encontrada.</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/finca" className="text-muted" style={{ fontSize: "0.85rem" }}>
            ← Fincas
          </Link>
          <h1>{finca.nombre}</h1>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Link className="btn secondary" to={`/finca/${finca.id}/croquis`}>
            🗺️ Croquis
          </Link>
          <button className="btn secondary" onClick={() => setEditFinca(true)}>
            Editar
          </button>
        </div>
      </div>

      <div className="card">
        {finca.ubicacion && <p className="text-muted">{finca.ubicacion}</p>}
        {finca.superficieTotal != null && <p>Superficie total: {finca.superficieTotal} ha</p>}
        {finca.notas && <p>{finca.notas}</p>}
        <button
          className="btn danger small"
          style={{ marginTop: "0.5rem" }}
          onClick={() => {
            if (confirm(`¿Borrar la finca "${finca.nombre}" y todo su contenido?`)) {
              deleteFinca.mutate(finca.id, { onSuccess: () => navigate("/finca") });
            }
          }}
        >
          Borrar finca
        </button>
      </div>

      <ClimaCard finca={finca} />

      <div className="page-header" style={{ marginTop: "1.25rem" }}>
        <h2>Sectores</h2>
        <button className="btn small" onClick={() => setSectorModal({ mode: "create" })}>
          + Nuevo sector
        </button>
      </div>

      {(finca.sectores ?? []).length === 0 && (
        <div className="card empty-state">Todavía no hay sectores en esta finca.</div>
      )}

      {(finca.sectores ?? []).map((sector) => (
        <div className="card" key={sector.id}>
          <div className="page-header" style={{ marginBottom: "0.5rem" }}>
            <h3 style={{ margin: 0 }}>{sector.nombre}</h3>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              <button className="btn secondary small" onClick={() => setSectorModal({ mode: "edit", sector })}>
                Editar
              </button>
              <button
                className="btn danger small"
                onClick={() => {
                  if (confirm(`¿Borrar el sector "${sector.nombre}" y sus cuadros?`)) {
                    deleteSector.mutate(sector.id);
                  }
                }}
              >
                Borrar
              </button>
            </div>
          </div>
          {sector.descripcion && <p className="text-muted">{sector.descripcion}</p>}

          <RecordList<Cuadro>
            items={sector.cuadros}
            emptyMessage="Sin cuadros en este sector."
            onRowClick={(c) => navigate(`/cuadros/${c.id}`)}
            columns={[
              { key: "nombre", label: "Cuadro" },
              {
                key: "superficie",
                label: "Superficie",
                render: (c) => (c.superficie != null ? `${c.superficie} ha` : "—"),
              },
              {
                key: "sistemaRiego",
                label: "Riego",
                render: (c) => RIEGO_OPTIONS.find((o) => o.value === c.sistemaRiego)?.label ?? "—",
              },
              {
                key: "cultivos",
                label: "Cultivos activos",
                render: (c) =>
                  (c.campanas ?? []).length > 0
                    ? c.campanas!.map((camp) => camp.cultivo?.nombre).filter(Boolean).join(", ")
                    : "—",
              },
            ]}
            onEdit={(c) => setCuadroModal({ mode: "edit", sectorId: sector.id, cuadro: c })}
            onDelete={(c) => {
              if (confirm(`¿Borrar el cuadro "${c.nombre}"?`)) deleteCuadro.mutate(c.id);
            }}
          />

          <button
            className="btn secondary small"
            style={{ marginTop: "0.6rem" }}
            onClick={() => setCuadroModal({ mode: "create", sectorId: sector.id })}
          >
            + Nuevo cuadro
          </button>
        </div>
      ))}

      {editFinca && (
        <Modal title="Editar finca" onClose={() => setEditFinca(false)}>
          <RecordForm
            fields={fincaFields}
            initial={finca}
            submitting={updateFinca.isPending}
            onCancel={() => setEditFinca(false)}
            onSubmit={(data) =>
              updateFinca.mutate({ id: finca.id, data }, { onSuccess: () => setEditFinca(false) })
            }
          />
        </Modal>
      )}

      {sectorModal && (
        <Modal
          title={sectorModal.mode === "create" ? "Nuevo sector" : "Editar sector"}
          onClose={() => setSectorModal(null)}
        >
          <RecordForm
            fields={sectorFields}
            initial={sectorModal.sector}
            submitting={createSector.isPending || updateSector.isPending}
            onCancel={() => setSectorModal(null)}
            onSubmit={(data) => {
              if (sectorModal.mode === "create") {
                createSector.mutate({ ...data, fincaId } as Partial<Sector>, {
                  onSuccess: () => setSectorModal(null),
                });
              } else if (sectorModal.sector) {
                updateSector.mutate(
                  { id: sectorModal.sector.id, data },
                  { onSuccess: () => setSectorModal(null) }
                );
              }
            }}
          />
        </Modal>
      )}

      {cuadroModal && (
        <Modal
          title={cuadroModal.mode === "create" ? "Nuevo cuadro" : "Editar cuadro"}
          onClose={() => setCuadroModal(null)}
        >
          <RecordForm
            fields={cuadroFields}
            initial={cuadroModal.cuadro}
            submitting={createCuadro.isPending || updateCuadro.isPending}
            onCancel={() => setCuadroModal(null)}
            onSubmit={(data) => {
              if (cuadroModal.mode === "create") {
                createCuadro.mutate(
                  { ...data, sectorId: cuadroModal.sectorId } as Partial<Cuadro>,
                  { onSuccess: () => setCuadroModal(null) }
                );
              } else if (cuadroModal.cuadro) {
                updateCuadro.mutate(
                  { id: cuadroModal.cuadro.id, data },
                  { onSuccess: () => setCuadroModal(null) }
                );
              }
            }}
          />
        </Modal>
      )}
    </div>
  );
}
