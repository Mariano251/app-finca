import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCreate, useList } from "../../api/useCrud";
import type { Finca, Insumo } from "../../api/types";
import { Modal } from "../../components/Modal";
import { RecordForm, type FieldSchema } from "../../components/RecordForm";
import { CATEGORIA_INSUMO_OPTIONS } from "../../constants";

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
    { name: "unidad", label: "Unidad", type: "text", required: true, placeholder: "L, kg, bolsa..." },
    { name: "stockMinimo", label: "Stock mínimo (alerta)", type: "number", step: "0.01" },
    { name: "notas", label: "Notas", type: "textarea", fullWidth: true },
  ];
}

function labelFor(categoria: string) {
  return CATEGORIA_INSUMO_OPTIONS.find((o) => o.value === categoria)?.label ?? categoria;
}

export default function StockList() {
  const [categoria, setCategoria] = useState("");
  const [fincaId, setFincaId] = useState("");
  const { data: fincas } = useList<Finca>("/fincas");
  const params = useMemo(() => {
    const p: Record<string, string> = { activo: "true" };
    if (fincaId) p.fincaId = fincaId;
    return p;
  }, [fincaId]);
  const { data: insumos, isLoading } = useList<Insumo>("/insumos", params);
  const create = useCreate<Insumo>("/insumos");
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();

  const filtrados = (insumos ?? []).filter((i) => !categoria || i.categoria === categoria);

  return (
    <div>
      <div className="page-header">
        <h1>Stock de insumos</h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn" onClick={() => setShowCreate(true)}>
            + Nuevo insumo
          </button>
          <button className="btn secondary" onClick={() => navigate("/carga-rapida?modo=stock")}>
            ⚡ Carga rápida
          </button>
        </div>
      </div>

      {fincas && fincas.length > 1 && (
        <div className="field" style={{ maxWidth: "280px", marginBottom: "0.75rem" }}>
          <label htmlFor="fincaFiltro">Finca</label>
          <select id="fincaFiltro" value={fincaId} onChange={(e) => setFincaId(e.target.value)}>
            <option value="">Todas las fincas</option>
            {fincas.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nombre}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="tabs">
        <button className={"tab-btn" + (categoria === "" ? " active" : "")} onClick={() => setCategoria("")}>
          Todos
        </button>
        {CATEGORIA_INSUMO_OPTIONS.map((o) => (
          <button
            key={o.value}
            className={"tab-btn" + (categoria === o.value ? " active" : "")}
            onClick={() => setCategoria(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-muted">Cargando…</p>}
      {!isLoading && filtrados.length === 0 && (
        <div className="card empty-state">No hay insumos cargados en esta categoría.</div>
      )}

      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
        {filtrados.map((i) => {
          const negativo = i.stockActual < 0;
          const bajo = !negativo && i.stockMinimo != null && i.stockActual <= i.stockMinimo;
          return (
            <div className="card" key={i.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/stock/${i.id}`)}>
              <div className="page-header" style={{ marginBottom: "0.3rem" }}>
                <h3 style={{ margin: 0 }}>{i.nombre}</h3>
                {negativo && <span className="tag" style={{ background: "#fbe9e7", color: "var(--color-danger)" }}>Stock negativo</span>}
                {bajo && <span className="tag" style={{ background: "#fbe9e7", color: "var(--color-danger)" }}>Stock bajo</span>}
              </div>
              <p className="text-muted" style={{ fontSize: "0.8rem" }}>
                {labelFor(i.categoria)}
                {i.finca ? ` · ${i.finca.nombre}` : fincas && fincas.length > 1 ? " · Compartido" : ""}
              </p>
              <p style={{ fontSize: "1.1rem", fontWeight: 700, color: negativo ? "var(--color-danger)" : undefined }}>
                {i.stockActual.toLocaleString("es-AR")} <span style={{ fontSize: "0.8rem", fontWeight: 400 }}>{i.unidad}</span>
              </p>
              {i.stockMinimo != null && (
                <p className="text-muted" style={{ fontSize: "0.75rem" }}>Mínimo: {i.stockMinimo} {i.unidad}</p>
              )}
            </div>
          );
        })}
      </div>

      {showCreate && (
        <Modal title="Nuevo insumo" onClose={() => setShowCreate(false)}>
          <RecordForm
            fields={insumoFields(fincas ?? [])}
            initial={fincaId ? { fincaId } : undefined}
            submitting={create.isPending}
            onCancel={() => setShowCreate(false)}
            onSubmit={(data) =>
              create.mutate(data as Partial<Insumo>, {
                onSuccess: (i: Insumo) => {
                  setShowCreate(false);
                  navigate(`/stock/${i.id}`);
                },
              })
            }
          />
        </Modal>
      )}
    </div>
  );
}
