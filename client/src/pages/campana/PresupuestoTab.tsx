import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";
import { useCreate, useDelete, useList, useUpdate } from "../../api/useCrud";
import { Modal } from "../../components/Modal";
import { RecordForm, type FieldSchema } from "../../components/RecordForm";
import { RecordList } from "../../components/RecordList";
import type { CategoriaCosto, Presupuesto } from "../../api/types";
import { CATEGORIA_COSTO_OPTIONS } from "../../constants";

const money = (n: number) => n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

interface FilaComparacion {
  id: number;
  categoria: string | null;
  presupuestado: number;
  real: number;
  diferencia: number;
}

const categoriaOptions = [{ value: "", label: "Total campaña" }, ...CATEGORIA_COSTO_OPTIONS];

const presupuestoFields: FieldSchema[] = [
  { name: "categoria", label: "Categoría (vacío = total de la campaña)", type: "select", options: categoriaOptions },
  { name: "montoPresupuestado", label: "Monto presupuestado ($)", type: "number", step: "0.01", required: true },
  { name: "notas", label: "Notas", type: "textarea", fullWidth: true },
];

function labelCategoria(categoria: string | null) {
  if (!categoria) return "Total campaña";
  return CATEGORIA_COSTO_OPTIONS.find((o) => o.value === categoria)?.label ?? categoria;
}

/** Presupuesto vs Real por campaña: las líneas se cargan a mano (Presupuesto), el "Real" se
 *  calcula en el server a partir de los costos directos + la porción de costos indirectos
 *  asignada a esta campaña (GET /economia/presupuesto). */
export function PresupuestoTab({ campanaId }: { campanaId: number }) {
  const nestedPath = `/campanas/${campanaId}/presupuestos`;
  const standalonePath = "/presupuestos";
  const economiaKey = "/economia/presupuesto";

  const { data: presupuestos, isLoading } = useList<Presupuesto>(nestedPath);
  const { data: comparacion } = useQuery<{ campanaId: number; filas: FilaComparacion[] }>({
    queryKey: [economiaKey, campanaId],
    queryFn: async () => (await api.get("/economia/presupuesto", { params: { campanaId } })).data,
  });

  const create = useCreate<Presupuesto>(nestedPath, [nestedPath, economiaKey]);
  const update = useUpdate<Presupuesto>(standalonePath, [nestedPath, economiaKey], [nestedPath]);
  const del = useDelete(standalonePath, [nestedPath, economiaKey], [nestedPath]);
  const [modal, setModal] = useState<{ mode: "create" | "edit"; record?: Presupuesto } | null>(null);

  const filaPorId = new Map((comparacion?.filas ?? []).map((f) => [f.id, f]));

  return (
    <div>
      <div className="page-header">
        <h3 style={{ margin: 0 }}>Presupuesto vs Real</h3>
        <button className="btn small" onClick={() => setModal({ mode: "create" })}>
          + Agregar
        </button>
      </div>

      {isLoading ? (
        <p className="text-muted">Cargando…</p>
      ) : (
        <RecordList<Presupuesto>
          items={presupuestos}
          emptyMessage="Todavía no hay presupuesto cargado para esta campaña."
          columns={[
            { key: "categoria", label: "Categoría", render: (p) => labelCategoria(p.categoria ?? null) },
            { key: "montoPresupuestado", label: "Presupuestado", render: (p) => money(p.montoPresupuestado) },
            { key: "real", label: "Real", render: (p) => money(filaPorId.get(p.id)?.real ?? 0) },
            {
              key: "diferencia",
              label: "Diferencia",
              render: (p) => {
                const d = filaPorId.get(p.id)?.diferencia ?? p.montoPresupuestado;
                return <span style={{ color: d >= 0 ? "var(--color-primary-dark)" : "var(--color-danger)" }}>{money(d)}</span>;
              },
            },
          ]}
          onEdit={(p) => setModal({ mode: "edit", record: p })}
          onDelete={(p) => {
            if (confirm("¿Borrar esta línea de presupuesto?")) del.mutate(p.id);
          }}
        />
      )}

      {modal && (
        <Modal
          title={modal.mode === "create" ? "Nueva línea de presupuesto" : "Editar presupuesto"}
          onClose={() => setModal(null)}
        >
          <RecordForm
            fields={presupuestoFields}
            initial={modal.record && { ...modal.record, categoria: modal.record.categoria ?? "" }}
            submitting={create.isPending || update.isPending}
            onCancel={() => setModal(null)}
            onSubmit={(formData) => {
              const payload = { ...formData, categoria: formData.categoria ? (formData.categoria as CategoriaCosto) : null };
              if (modal.mode === "create") {
                create.mutate(payload as Partial<Presupuesto>, { onSuccess: () => setModal(null) });
              } else if (modal.record) {
                update.mutate({ id: modal.record.id, data: payload }, { onSuccess: () => setModal(null) });
              }
            }}
          />
        </Modal>
      )}
    </div>
  );
}
