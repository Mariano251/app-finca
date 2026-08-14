import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useCreate, useDelete, useList, useOne, useUpdate } from "../../api/useCrud";
import type { Compra, Finca, Insumo, MovimientoStock } from "../../api/types";
import { Modal } from "../../components/Modal";
import { RecordForm, type FieldSchema } from "../../components/RecordForm";
import { RecordList } from "../../components/RecordList";
import { CATEGORIA_INSUMO_OPTIONS, TIPO_MOVIMIENTO_OPTIONS } from "../../constants";

const money = (n: number) => n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 });

const MESES_A_MOSTRAR = 12;

/** Agrupa los movimientos de SALIDA (consumo real, sin importar si viene de una carga manual o de
 *  una aplicación/labor) por mes calendario, para ver de un vistazo cuánto se está consumiendo
 *  mes a mes — útil sobre todo para combustible, donde no hay un cuadro/campaña a la cual mirar. */
function useConsumoMensual(movimientos: MovimientoStock[] | undefined, costoUnitario: number | null | undefined) {
  return useMemo(() => {
    const porMes = new Map<string, number>();
    for (const m of movimientos ?? []) {
      if (m.tipo !== "SALIDA") continue;
      const d = new Date(m.fecha);
      const clave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      porMes.set(clave, (porMes.get(clave) ?? 0) + m.cantidad);
    }

    const hoy = new Date();
    const meses: { clave: string; label: string; cantidad: number; costo: number }[] = [];
    for (let i = MESES_A_MOSTRAR - 1; i >= 0; i--) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const clave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const cantidad = porMes.get(clave) ?? 0;
      meses.push({
        clave,
        label: d.toLocaleDateString("es-AR", { month: "short", year: "2-digit" }),
        cantidad,
        costo: costoUnitario != null ? cantidad * costoUnitario : 0,
      });
    }
    return meses;
  }, [movimientos, costoUnitario]);
}

function insumoFields(fincas: Finca[]): FieldSchema[] {
  return [
    { name: "nombre", label: "Nombre", type: "text", required: true },
    { name: "categoria", label: "Categoría", type: "select", options: CATEGORIA_INSUMO_OPTIONS, required: true },
    {
      name: "fincaId",
      label: "Finca",
      type: "select",
      options: fincas.map((f) => ({ value: String(f.id), label: f.nombre })),
      placeholder: "Compartido entre fincas",
    },
    { name: "unidad", label: "Unidad", type: "text", required: true },
    { name: "stockMinimo", label: "Stock mínimo (alerta)", type: "number", step: "0.01" },
    { name: "activo", label: "Activo", type: "checkbox" },
    { name: "notas", label: "Notas", type: "textarea", fullWidth: true },
  ];
}

const movimientoFields: FieldSchema[] = [
  { name: "tipo", label: "Tipo de movimiento", type: "select", options: TIPO_MOVIMIENTO_OPTIONS, required: true },
  { name: "cantidad", label: "Cantidad", type: "number", step: "0.01", required: true },
  { name: "fecha", label: "Fecha", type: "date", required: true },
  { name: "motivo", label: "Motivo", type: "text", placeholder: "Ajuste de inventario, donación..." },
  { name: "notas", label: "Notas", type: "textarea", fullWidth: true },
];

const compraFields: FieldSchema[] = [
  { name: "fecha", label: "Fecha", type: "date", required: true },
  { name: "cantidad", label: "Cantidad", type: "number", step: "0.01", required: true },
  { name: "precioUnitario", label: "Precio unitario", type: "number", step: "0.01", required: true },
  { name: "proveedor", label: "Proveedor", type: "text" },
  { name: "factura", label: "N° de factura", type: "text" },
  { name: "lote", label: "Lote", type: "text" },
  { name: "vencimiento", label: "Vencimiento", type: "date" },
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
  const { data: fincas } = useList<Finca>("/fincas");
  const update = useUpdate<Insumo>("/insumos");
  const del = useDelete("/insumos");
  const [editing, setEditing] = useState(false);

  const movimientosPath = `/insumos/${insumoId}/movimientos`;
  const { data: movimientos } = useList<MovimientoStock>(movimientosPath);
  const createMovimiento = useCreate<MovimientoStock>(movimientosPath, [movimientosPath, "/insumos"]);
  const [showMovimiento, setShowMovimiento] = useState(false);

  const comprasPath = `/insumos/${insumoId}/compras`;
  const { data: compras } = useList<Compra>(comprasPath);
  const createCompra = useCreate<Compra>(comprasPath, [comprasPath, movimientosPath, "/insumos"]);
  const [showCompra, setShowCompra] = useState(false);

  const consumoMensual = useConsumoMensual(movimientos, insumo?.costoUnitario);
  const hayConsumo = consumoMensual.some((m) => m.cantidad > 0);
  const totalAnual = consumoMensual.reduce((acc, m) => acc + m.cantidad, 0);
  const costoAnual = consumoMensual.reduce((acc, m) => acc + m.costo, 0);

  if (isLoading) return <p className="text-muted">Cargando…</p>;
  if (!insumo) return <div className="card empty-state">Insumo no encontrado.</div>;

  const bajo = insumo.stockMinimo != null && insumo.stockActual <= insumo.stockMinimo;
  const negativo = insumo.stockActual < 0;

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
          <button className="btn small" onClick={() => setShowCompra(true)}>
            + Compra
          </button>
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
            <span className="text-muted">Finca: </span>
            {insumo.finca?.nombre ?? "Compartido entre fincas"}
          </div>
          <div>
            <span className="text-muted">Stock actual: </span>
            <strong style={bajo || negativo ? { color: "var(--color-danger)" } : undefined}>
              {insumo.stockActual.toLocaleString("es-AR")} {insumo.unidad}
            </strong>
            {negativo ? (
              <span className="tag" style={{ marginLeft: "0.4rem", background: "#fbe9e7", color: "var(--color-danger)" }}>
                Stock negativo
              </span>
            ) : (
              bajo && (
                <span className="tag" style={{ marginLeft: "0.4rem", background: "#fbe9e7", color: "var(--color-danger)" }}>
                  Stock bajo
                </span>
              )
            )}
          </div>
          {negativo && (
            <div style={{ gridColumn: "1 / -1", fontSize: "0.8rem", color: "var(--color-danger)" }}>
              El stock quedó negativo — probablemente dos movimientos offline en distintos
              dispositivos descontaron lo mismo antes de sincronizar. Revisá el historial de abajo
              y cargá un ajuste manual si hace falta.
            </div>
          )}
          {insumo.stockMinimo != null && (
            <div>
              <span className="text-muted">Stock mínimo: </span>
              {insumo.stockMinimo} {insumo.unidad}
            </div>
          )}
          <div>
            <span className="text-muted">Costo unitario promedio: </span>
            {insumo.costoUnitario != null ? `${money(insumo.costoUnitario)} / ${insumo.unidad}` : "— (sin compras cargadas)"}
          </div>
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
        <h2>Consumo mensual</h2>
      </div>
      <div className="card">
        {!hayConsumo ? (
          <p className="text-muted">
            Todavía no hay salidas registradas para calcular el consumo mensual. Se suman los
            movimientos de "Salida (consumo)", ya sea cargados a mano o generados por una
            aplicación/labor.
          </p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={consumoMensual} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} width={60} />
                <Tooltip
                  formatter={((value: number) => [`${Number(value ?? 0).toLocaleString("es-AR")} ${insumo.unidad}`, "Consumo"]) as (
                    value: unknown
                  ) => [string, string]}
                  contentStyle={{ fontSize: "0.85rem" }}
                />
                <Bar dataKey="cantidad" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="table-wrap" style={{ marginTop: "0.5rem" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Mes</th>
                    <th>Consumo</th>
                    {insumo.costoUnitario != null && <th>Costo estimado</th>}
                  </tr>
                </thead>
                <tbody>
                  {consumoMensual
                    .filter((m) => m.cantidad > 0)
                    .slice()
                    .reverse()
                    .map((m) => (
                      <tr key={m.clave}>
                        <td>{m.label}</td>
                        <td>
                          {m.cantidad.toLocaleString("es-AR")} {insumo.unidad}
                        </td>
                        {insumo.costoUnitario != null && <td>{money(m.costo)}</td>}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <p className="text-muted" style={{ fontSize: "0.8rem", marginTop: "0.5rem" }}>
              Total últimos 12 meses: {totalAnual.toLocaleString("es-AR")} {insumo.unidad}
              {insumo.costoUnitario != null && ` (${money(costoAnual)})`}
            </p>
          </>
        )}
      </div>

      <div className="page-header" style={{ marginTop: "1.25rem" }}>
        <h2>Historial de compras</h2>
      </div>
      <div className="card">
        <RecordList<Compra>
          items={compras}
          emptyMessage="Todavía no hay compras cargadas. El costo unitario se calcula a partir de estas."
          columns={[
            { key: "fecha", label: "Fecha", render: (c) => new Date(c.fecha).toLocaleDateString() },
            { key: "cantidad", label: "Cantidad", render: (c) => `${c.cantidad} ${insumo.unidad}` },
            { key: "precioUnitario", label: "Precio unitario", render: (c) => money(c.precioUnitario) },
            { key: "montoTotal", label: "Monto total", render: (c) => money(c.montoTotal) },
            { key: "proveedor", label: "Proveedor" },
            { key: "lote", label: "Lote" },
            {
              key: "vencimiento",
              label: "Vencimiento",
              render: (c) => (c.vencimiento ? new Date(c.vencimiento).toLocaleDateString() : "—"),
            },
          ]}
        />
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
            fields={insumoFields(fincas ?? [])}
            initial={{ ...insumo, fincaId: insumo.fincaId != null ? String(insumo.fincaId) : "" }}
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

      {showCompra && (
        <Modal title="Nueva compra" onClose={() => setShowCompra(false)}>
          <RecordForm
            fields={compraFields}
            submitting={createCompra.isPending}
            onCancel={() => setShowCompra(false)}
            onSubmit={(data) =>
              createCompra.mutate(data as Partial<Compra>, {
                onSuccess: () => setShowCompra(false),
              })
            }
          />
        </Modal>
      )}
    </div>
  );
}
