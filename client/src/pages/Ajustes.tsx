import { useState } from "react";
import { useCreate, useDelete, useList, useUpdate } from "../api/useCrud";
import type { Cultivo, Variedad } from "../api/types";
import { Modal } from "../components/Modal";
import { RecordForm, type FieldSchema } from "../components/RecordForm";
import { RecordList } from "../components/RecordList";

const cultivoFields: FieldSchema[] = [
  { name: "nombre", label: "Nombre", type: "text", required: true },
  { name: "nombreCientifico", label: "Nombre científico", type: "text" },
  { name: "activo", label: "Activo", type: "checkbox" },
  { name: "notas", label: "Notas", type: "textarea", fullWidth: true },
];

const variedadFields: FieldSchema[] = [
  { name: "nombre", label: "Nombre", type: "text", required: true },
  { name: "activo", label: "Activo", type: "checkbox" },
  { name: "notas", label: "Notas", type: "textarea", fullWidth: true },
];

export default function Ajustes() {
  const { data: cultivos } = useList<Cultivo>("/cultivos");
  const createCultivo = useCreate<Cultivo>("/cultivos");
  const updateCultivo = useUpdate<Cultivo>("/cultivos");
  const deleteCultivo = useDelete("/cultivos");
  const [cultivoModal, setCultivoModal] = useState<{ mode: "create" | "edit"; cultivo?: Cultivo } | null>(
    null
  );

  const createVariedad = useCreate<Variedad>("/variedades", ["/variedades", "/cultivos"]);
  const updateVariedad = useUpdate<Variedad>("/variedades", ["/variedades", "/cultivos"]);
  const deleteVariedad = useDelete("/variedades", ["/variedades", "/cultivos"]);
  const [variedadModal, setVariedadModal] = useState<{
    mode: "create" | "edit";
    cultivoId: number;
    variedad?: Variedad;
  } | null>(null);

  return (
    <div>
      <div className="page-header">
        <h1>Ajustes — Catálogo de cultivos</h1>
        <button className="btn" onClick={() => setCultivoModal({ mode: "create" })}>
          + Nuevo cultivo
        </button>
      </div>

      {(cultivos ?? []).map((c) => (
        <div className="card" key={c.id}>
          <div className="page-header" style={{ marginBottom: "0.5rem" }}>
            <div>
              <h3 style={{ margin: 0 }}>{c.nombre}</h3>
              {c.nombreCientifico && <span className="text-muted">{c.nombreCientifico}</span>}
              {!c.activo && <span className="tag">Inactivo</span>}
            </div>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              <button className="btn secondary small" onClick={() => setCultivoModal({ mode: "edit", cultivo: c })}>
                Editar
              </button>
              <button
                className="btn danger small"
                onClick={() => {
                  if (confirm(`¿Borrar el cultivo "${c.nombre}"?`)) deleteCultivo.mutate(c.id);
                }}
              >
                Borrar
              </button>
            </div>
          </div>

          <RecordList<Variedad>
            items={c.variedades}
            emptyMessage="Sin variedades registradas."
            columns={[{ key: "nombre", label: "Variedad" }]}
            onEdit={(v) => setVariedadModal({ mode: "edit", cultivoId: c.id, variedad: v })}
            onDelete={(v) => {
              if (confirm(`¿Borrar la variedad "${v.nombre}"?`)) deleteVariedad.mutate(v.id);
            }}
          />
          <button
            className="btn secondary small"
            style={{ marginTop: "0.5rem" }}
            onClick={() => setVariedadModal({ mode: "create", cultivoId: c.id })}
          >
            + Nueva variedad
          </button>
        </div>
      ))}

      {cultivoModal && (
        <Modal
          title={cultivoModal.mode === "create" ? "Nuevo cultivo" : "Editar cultivo"}
          onClose={() => setCultivoModal(null)}
        >
          <RecordForm
            fields={cultivoFields}
            initial={cultivoModal.cultivo}
            submitting={createCultivo.isPending || updateCultivo.isPending}
            onCancel={() => setCultivoModal(null)}
            onSubmit={(data) => {
              if (cultivoModal.mode === "create") {
                createCultivo.mutate(data as Partial<Cultivo>, { onSuccess: () => setCultivoModal(null) });
              } else if (cultivoModal.cultivo) {
                updateCultivo.mutate(
                  { id: cultivoModal.cultivo.id, data },
                  { onSuccess: () => setCultivoModal(null) }
                );
              }
            }}
          />
        </Modal>
      )}

      {variedadModal && (
        <Modal
          title={variedadModal.mode === "create" ? "Nueva variedad" : "Editar variedad"}
          onClose={() => setVariedadModal(null)}
        >
          <RecordForm
            fields={variedadFields}
            initial={variedadModal.variedad}
            submitting={createVariedad.isPending || updateVariedad.isPending}
            onCancel={() => setVariedadModal(null)}
            onSubmit={(data) => {
              if (variedadModal.mode === "create") {
                createVariedad.mutate(
                  { ...data, cultivoId: variedadModal.cultivoId } as Partial<Variedad>,
                  { onSuccess: () => setVariedadModal(null) }
                );
              } else if (variedadModal.variedad) {
                updateVariedad.mutate(
                  { id: variedadModal.variedad.id, data },
                  { onSuccess: () => setVariedadModal(null) }
                );
              }
            }}
          />
        </Modal>
      )}
    </div>
  );
}
