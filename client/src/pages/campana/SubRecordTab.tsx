import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";
import { useCreate, useDelete, useList, useUpdate } from "../../api/useCrud";
import { Modal } from "../../components/Modal";
import { RecordForm } from "../../components/RecordForm";
import { RecordList } from "../../components/RecordList";
import { ImageAttachments } from "../../components/ImageAttachments";
import { ReplicarModal } from "./ReplicarModal";
import type { Insumo, ProductoComercial } from "../../api/types";
import type { FieldsCtx, SubRecordConfig, TipoProblema } from "./subRecordConfig";

interface Row {
  id: number;
  [key: string]: unknown;
}

interface ProblemaResumen {
  tipo: TipoProblema;
  nombre: string;
}

interface RotacionCheck {
  alerta: boolean;
  motivo?: string;
  grupos: string[];
  coincidencias: { fecha: string; producto: string; grupoAccion: string }[];
}

/** Paths cuyo formulario tiene un campo "nombre sugerido" (combobox) que necesita la lista de
 *  problemas ya cargados — ver campoNombreSugerido en subRecordConfig.tsx. */
const PATHS_CON_NOMBRE_SUGERIDO = new Set(["malezas", "enfermedades", "plagas"]);

/** Nombre combinado de los principios activos de un producto de la Biblioteca, para autocompletar
 *  el campo de texto libre "Principio activo" del formulario de Aplicaciones. */
function nombrePrincipiosActivos(p: ProductoComercial): string {
  return (p.principiosActivos ?? []).map((r) => r.principioActivo?.nombre).filter(Boolean).join(" + ");
}

export function SubRecordTab({
  campanaId,
  config,
  fincaId,
  cuadroId,
}: {
  campanaId: number;
  config: SubRecordConfig;
  /** Necesarios sólo para el botón "Copiar a otros cuadros" (config.replicable). */
  fincaId?: number;
  cuadroId?: number;
}) {
  const nestedPath = `/campanas/${campanaId}/${config.path}`;
  const standalonePath = `/${config.path}`;

  const { data, isLoading } = useList<Row>(nestedPath);
  const { data: insumos } = useList<Insumo>("/insumos", { activo: "true" });
  const necesitaNombreSugerido = PATHS_CON_NOMBRE_SUGERIDO.has(config.path);
  const { data: problemas } = useList<ProblemaResumen>("/conocimiento/problemas/lista", undefined, {
    enabled: necesitaNombreSugerido,
  });
  const create = useCreate<Row>(nestedPath, [nestedPath, "/insumos"]);
  const update = useUpdate<Row>(standalonePath, [nestedPath, "/insumos"], [nestedPath]);
  const del = useDelete(standalonePath, [nestedPath, "/insumos"], [nestedPath]);
  const [modal, setModal] = useState<{ mode: "create" | "edit"; record?: Row } | null>(null);
  const [replicando, setReplicando] = useState<Row | null>(null);

  // Integración con la Biblioteca de Productos y Principios Activos (solo para "aplicaciones"):
  // elegir un producto acá autocompleta productoComercial/principioActivo del formulario genérico
  // sin tocar RecordForm, y habilita el aviso de repetición de grupo de acción en este lote.
  const esAplicaciones = config.path === "aplicaciones";
  const { data: productosLib } = useList<ProductoComercial>(
    "/productos-comerciales",
    { disponible: "true" },
    { enabled: esAplicaciones }
  );
  const [libPick, setLibPick] = useState<ProductoComercial | null>(null);
  const { data: rotacion } = useQuery<RotacionCheck>({
    queryKey: ["/biblioteca/rotacion-check", cuadroId, libPick?.id],
    queryFn: async () =>
      (await api.get("/biblioteca/rotacion-check", { params: { cuadroId, productoComercialId: libPick!.id } })).data,
    enabled: esAplicaciones && !!cuadroId && !!libPick,
  });

  const nombresExistentes: FieldsCtx["nombresExistentes"] = { enfermedad: [], plaga: [], maleza: [] };
  for (const p of problemas ?? []) nombresExistentes[p.tipo].push(p.nombre);

  const fields =
    typeof config.fields === "function" ? config.fields({ insumos: insumos ?? [], nombresExistentes }) : config.fields;

  function withInsumoCoercido(formData: Record<string, unknown>) {
    if (!("insumoId" in formData)) return formData;
    return { ...formData, insumoId: formData.insumoId ? Number(formData.insumoId) : null };
  }

  /** Solo para "aplicaciones": adjunta el link a la Biblioteca elegido arriba del formulario —
   *  RecordForm no lo conoce porque no está en su lista de `fields` (no es editable a mano). */
  function withProductoLibId(formData: Record<string, unknown>) {
    if (!esAplicaciones) return formData;
    return { ...formData, productoComercialLibId: libPick ? libPick.id : (modal?.record?.productoComercialLibId ?? null) };
  }

  return (
    <div>
      <div className="page-header">
        <h3 style={{ margin: 0 }}>{config.label}</h3>
        <button
          className="btn small"
          onClick={() => {
            setLibPick(null);
            setModal({ mode: "create" });
          }}
        >
          + Agregar
        </button>
      </div>

      {isLoading ? (
        <p className="text-muted">Cargando…</p>
      ) : (
        <RecordList<Row>
          items={data}
          columns={config.columns}
          isReadOnly={config.isReadOnly}
          onEdit={(r) => {
            setLibPick(esAplicaciones ? ((r.productoComercialLib as ProductoComercial | undefined) ?? null) : null);
            setModal({ mode: "edit", record: r });
          }}
          onDelete={(r) => {
            if (confirm("¿Borrar este registro?")) del.mutate(r.id);
          }}
          extraActions={
            config.replicable
              ? (r) => (
                  <button
                    className="btn secondary small"
                    style={{ marginRight: "0.3rem" }}
                    type="button"
                    onClick={() => setReplicando(r)}
                  >
                    Copiar a otro cuadro
                  </button>
                )
              : undefined
          }
        />
      )}

      {replicando && (
        <ReplicarModal
          record={replicando}
          config={config}
          fincaId={fincaId}
          cuadroActualId={cuadroId}
          onClose={() => setReplicando(null)}
        />
      )}

      {modal && (
        <Modal
          title={modal.mode === "create" ? `Nuevo: ${config.label}` : `Editar: ${config.label}`}
          onClose={() => setModal(null)}
        >
          {esAplicaciones && (
            <div style={{ marginBottom: "0.75rem", borderBottom: "1px solid var(--color-border)", paddingBottom: "0.75rem" }}>
              <div className="field" style={{ marginBottom: "0.4rem" }}>
                <label>Buscar en la Biblioteca (opcional)</label>
                <select
                  value={libPick?.id ?? ""}
                  onChange={(e) => {
                    const producto = (productosLib ?? []).find((p) => p.id === Number(e.target.value));
                    setLibPick(producto ?? null);
                  }}
                >
                  <option value="">— Cargar producto a mano —</option>
                  {/* Si el registro ya tenía un producto vinculado que hoy no figura como disponible
                      (ej. discontinuado), se agrega igual para no perder la selección al editar. */}
                  {(libPick && !productosLib?.some((p) => p.id === libPick.id) ? [libPick, ...(productosLib ?? [])] : productosLib ?? []).map(
                    (p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombreComercial}
                      </option>
                    )
                  )}
                </select>
              </div>
              {rotacion?.alerta && (
                <div className="card" style={{ borderColor: "var(--color-warning)", padding: "0.5rem 0.75rem", fontSize: "0.85rem" }}>
                  ⚠️ Este lote ya usó el grupo de acción {rotacion.grupos.join(", ")} recientemente (
                  {rotacion.coincidencias
                    .slice(0, 3)
                    .map((c) => `${c.producto} el ${new Date(c.fecha).toLocaleDateString()}`)
                    .join("; ")}
                  ). Considerá rotar a otro grupo — esto es informativo, no reemplaza la etiqueta ni la evaluación
                  profesional.
                </div>
              )}
            </div>
          )}
          <RecordForm
            key={`${modal.mode}-${modal.record?.id ?? "new"}-${libPick?.id ?? "none"}`}
            fields={fields}
            initial={{
              ...modal.record,
              insumoId: modal.record?.insumoId != null ? String(modal.record.insumoId) : "",
              ...(libPick && esAplicaciones
                ? { productoComercial: libPick.nombreComercial, principioActivo: nombrePrincipiosActivos(libPick) }
                : {}),
            }}
            submitting={create.isPending || update.isPending}
            onCancel={() => setModal(null)}
            onSubmit={(formData) => {
              const payload = withProductoLibId(withInsumoCoercido(formData));
              if (modal.mode === "create") {
                create.mutate(payload as Partial<Row>, { onSuccess: () => setModal(null) });
              } else if (modal.record) {
                update.mutate({ id: modal.record.id, data: payload }, { onSuccess: () => setModal(null) });
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
