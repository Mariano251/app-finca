import { useState } from "react";
import { useCreate, useDelete, useList, useUpdate } from "../../api/useCrud";
import { Modal } from "../../components/Modal";
import { RecordForm } from "../../components/RecordForm";
import { RecordList } from "../../components/RecordList";
import { ImageAttachments } from "../../components/ImageAttachments";
import type { SubRecordConfig } from "./subRecordConfig";

interface Row {
  id: number;
  [key: string]: unknown;
}

export function SubRecordTab({ campanaId, config }: { campanaId: number; config: SubRecordConfig }) {
  const nestedPath = `/campanas/${campanaId}/${config.path}`;
  const standalonePath = `/${config.path}`;

  const { data, isLoading } = useList<Row>(nestedPath);
  const create = useCreate<Row>(nestedPath, [nestedPath]);
  const update = useUpdate<Row>(standalonePath, [nestedPath]);
  const del = useDelete(standalonePath, [nestedPath]);
  const [modal, setModal] = useState<{ mode: "create" | "edit"; record?: Row } | null>(null);

  return (
    <div>
      <div className="page-header">
        <h3 style={{ margin: 0 }}>{config.label}</h3>
        <button className="btn small" onClick={() => setModal({ mode: "create" })}>
          + Agregar
        </button>
      </div>

      {isLoading ? (
        <p className="text-muted">Cargando…</p>
      ) : (
        <RecordList<Row>
          items={data}
          columns={config.columns}
          onEdit={(r) => setModal({ mode: "edit", record: r })}
          onDelete={(r) => {
            if (confirm("¿Borrar este registro?")) del.mutate(r.id);
          }}
        />
      )}

      {modal && (
        <Modal
          title={modal.mode === "create" ? `Nuevo: ${config.label}` : `Editar: ${config.label}`}
          onClose={() => setModal(null)}
        >
          <RecordForm
            fields={config.fields}
            initial={modal.record}
            submitting={create.isPending || update.isPending}
            onCancel={() => setModal(null)}
            onSubmit={(formData) => {
              if (modal.mode === "create") {
                create.mutate(formData as Partial<Row>, { onSuccess: () => setModal(null) });
              } else if (modal.record) {
                update.mutate({ id: modal.record.id, data: formData }, { onSuccess: () => setModal(null) });
              }
            }}
          />
          {modal.mode === "edit" && config.entityType && modal.record && (
            <div style={{ marginTop: "1rem", borderTop: "1px solid var(--color-border)", paddingTop: "0.75rem" }}>
              <p className="text-muted" style={{ fontSize: "0.8rem", marginBottom: "0.4rem" }}>
                Fotos
              </p>
              <ImageAttachments entityType={config.entityType} entityId={modal.record.id} />
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
