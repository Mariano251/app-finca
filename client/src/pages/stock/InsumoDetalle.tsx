import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useCreate, useDelete, useList, useOne, useUpdate } from "../../api/useCrud";
import type { Insumo, MovimientoStock } from "../../api/types";
import { Modal } from "../../components/Modal";
import { RecordForm, type FieldSchema } from "../../components/RecordForm";
import { RecordList } from "../../components/RecordList";
import { CATEGORIA_INSUMO_OPTIONS, TIPO_MOVIMIENTO_OPTIONS } from "../../constants";

const insumoFields: FieldSchema[] = [
  { name: "nombre", label: "Nombre", type: "text", required: true },
  { name: "categoria", label: "Categoría", type: "select", options: CATEGORIA_INSUMO_OPTIONS, required: true },
  { name: "unidad", label: "Unidad", type: "text", required: true },
  { name: "stockMinimo", label: "Stock mínimo (alerta)", type: "number", step: "0.01" },
  { name: "activo", label: "Activo", type: "checkbox" },
  { name: "notas", label: "Notas", type: "textarea", fullWidth: true },
];

const movimientoFields: FieldSchema[] = [
  { name: "tipo", label: "Tipo de movimiento", type: "select", options: TIPO_MOVIMIENTO_OPTIONS, required: true },
  { name: "cantidad", label: "Cantidad", type: "number", step: "0.01", required: true },
  { name: "fecha", label: "Fecha", type: "date", required: true },
  { name: "motivo", label: "Motivo", type: "text", placeholder: "Compra, ajuste de inventario..." },
  { name: "notas", label: "Notas", type: "textarea", fullWidth: true },
];

function labelFor(options: { value: string; label: string }[], value: string) {
  return options.find((o) => o.value === value)?.label ?? value;
}

export default function InsumoDetalle() {
  const { id } = useParams();
  const insumoId = Number(id);
  const navigate = useNavigate();

  const { data: insumo, isLoading } = useOne<Insumo>("/insumos", insumoId);
  const update = useUpdate<Insumo>("/insumos");
  const del = useDelete("/insumos");
  const [editing, setEditing] = useState(false);

  const movimientosPath = `/insumos/${insumoId}/movimientos`;
  const { data: movimientos } = useList<MovimientoStock>(movimientosPath);
  const createMovimiento = useCreate<MovimientoStock>(movimientosPath, [movimientosPath, "/insumos"]);
  const [showMovimiento, setShowMovimiento] = useState(false);

  if (isLoading) return <p className="text-muted">Cargando…</p>;
  if (!insumo) return <div className="card empty-state">Insumo no encontrado.</div>;

  const bajo = insumo.stockMinimo != null && insumo.stockActual <= insumo.stockMinimo;

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/stock" className="text-muted" style={{ fontSize: "0.85rem" }}>
            ← Stock
          </Link>
          <h1>{insumo.nombre}</h1>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn small" onClick={() => setShowMovimiento(true)}>
            + Movimiento
          </button>
          <button className="btn secondary" onClick={() => setEditing(true)}>
            Editar
          </button>
        </div>
      </div>

      <div className="card">
        <div className="form-grid" style={{ rowGap: "0.4rem" }}>
          <div>
            <span className="text-muted">Categoría: </span>
            {labelFor(CATEGORIA_INSUMO_OPTIONS, insumo.categoria)}
          </div>
          <div>
            <span className="text-muted">Stock actual: </span>
            <strong style={bajo ? { color: "var(--color-danger)" } : undefined}>
              {insumo.stockActual.toLocaleString("es-AR")} {insumo.unidad}
            </strong>
            {bajo && <span className="tag" style={{ marginLeft: "0.4rem", background: "#fbe9e7", color: "var(--color-danger)" }}>Stock bajo</span>}
          </div>
          {insumo.stockMinimo != null && (
            <div>
              <span className="text-muted">Stock mínimo: </span>
              {insumo.stockMinimo} {insumo.unidad}
            </div>
          )}
          <div>
            <span className="text-muted">Estado: </span>
            <span className="tag">{insumo.activo ? "Activo" : "Inactivo"}</span>
          </div>
        </div>
        {insumo.notas && (
          <p style={{ marginTop: "0.5rem" }}>
            <span className="text-muted">Notas: </span>
            {insumo.notas}
          </p>
        )}
        <button
          className="btn danger small"
          style={{ marginTop: "0.5rem" }}
          onClick={() => {
            if (confirm(`¿Borrar el insumo "${insumo.nombre}" y su historial de movimientos?`)) {
              del.mutate(insumo.id, { onSuccess: () => navigate("/stock") });
            }
          }}
        >
          Borrar insumo
        </button>
      </div>

      <div className="page-header" style={{ marginTop: "1.25rem" }}>
        <h2>Historial de movimientos</h2>
      </div>
      <div className="card">
        <RecordList<MovimientoStock>
          items={movimientos}
          emptyMessage="Todavía no hay movimientos registrados."
          columns={[
            { key: "fecha", label: "Fecha", render: (m) => new Date(m.fecha).toLocaleDateString() },
            { key: "tipo", label: "Tipo", render: (m) => labelFor(TIPO_MOVIMIENTO_OPTIONS, m.tipo) },
            {
              key: "cantidad",
              label: "Cantidad",
              render: (m) => `${m.tipo === "SALIDA" ? "-" : "+"}${m.cantidad} ${insumo.unidad}`,
            },
            { key: "motivo", label: "Motivo" },
            {
              key: "origen",
              label: "Origen",
              render: (m) => (m.origen === "MANUAL" ? "Manual" : "Automático"),
            },
          ]}
        />
      </div>

      {editing && (
        <Modal title="Editar insumo" onClose={() => setEditing(false)}>
          <RecordForm
            fields={insumoFields}
            initial={insumo}
            submitting={update.isPending}
            onCancel={() => setEditing(false)}
            onSubmit={(data) => update.mutate({ id: insumo.id, data }, { onSuccess: () => setEditing(false) })}
          />
        </Modal>
      )}

      {showMovimiento && (
        <Modal title="Nuevo movimiento" onClose={() => setShowMovimiento(false)}>
          <RecordForm
            fields={movimientoFields}
            submitting={createMovimiento.isPending}
            onCancel={() => setShowMovimiento(false)}
            onSubmit={(data) =>
              createMovimiento.mutate(data as Partial<MovimientoStock>, {
                onSuccess: () => setShowMovimiento(false),
              })
            }
          />
        </Modal>
      )}
    </div>
  );
}
