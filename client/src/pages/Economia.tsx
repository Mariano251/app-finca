import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { useCreate, useDelete, useList, useUpdate } from "../api/useCrud";
import { Modal } from "../components/Modal";
import { RecordForm, type FieldSchema } from "../components/RecordForm";
import { RecordList } from "../components/RecordList";
import type { Campana, CostoIndirecto, CostoIndirectoAsignacion, Finca } from "../api/types";
import { METODO_DISTRIBUCION_OPTIONS } from "../constants";

interface RankingItem {
  id: number;
  nombre: string;
  superficieImplantada: number;
  costoDirecto: number;
  costoIndirecto: number;
  costoTotal: number;
  ingresoTotal: number;
  produccionTotal: number;
  campanas: number;
  margenBruto: number;
  costoPorHa: number | null;
  resultadoPorHa: number | null;
  costoPorKg: number | null;
}

const money = (n: number) => n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export default function Economia() {
  const [tab, setTab] = useState<"cultivo" | "cuadro" | "indirectos">("cultivo");

  return (
    <div>
      <div className="page-header">
        <h1>Economía y rentabilidad</h1>
      </div>

      <div className="tabs">
        <button className={"tab-btn" + (tab === "cultivo" ? " active" : "")} onClick={() => setTab("cultivo")}>
          Por cultivo
        </button>
        <button className={"tab-btn" + (tab === "cuadro" ? " active" : "")} onClick={() => setTab("cuadro")}>
          Por cuadro
        </button>
        <button className={"tab-btn" + (tab === "indirectos" ? " active" : "")} onClick={() => setTab("indirectos")}>
          Costos indirectos
        </button>
      </div>

      {tab === "indirectos" ? <CostosIndirectosTab /> : <RankingTab groupBy={tab} />}
    </div>
  );
}

function RankingTab({ groupBy }: { groupBy: "cultivo" | "cuadro" }) {
  const { data, isLoading } = useQuery<{ groupBy: string; ranking: RankingItem[] }>({
    queryKey: ["/economia/rentabilidad", groupBy],
    queryFn: async () => (await api.get("/economia/rentabilidad", { params: { groupBy } })).data,
  });

  return (
    <>
      {isLoading && <p className="text-muted">Cargando…</p>}
      {!isLoading && (data?.ranking.length ?? 0) === 0 && (
        <div className="card empty-state">
          Todavía no hay costos ni ventas cargados para calcular rentabilidad.
        </div>
      )}

      {(data?.ranking.length ?? 0) > 0 && (
        <div className="card table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{groupBy === "cultivo" ? "Cultivo" : "Cuadro"}</th>
                <th>Campañas</th>
                <th>Superficie (ha)</th>
                <th>Costo directo</th>
                <th>Costo indirecto</th>
                <th>Costo total</th>
                <th>Ingreso total</th>
                <th>Margen bruto</th>
                <th>Resultado / ha</th>
                <th>Costo / kg</th>
              </tr>
            </thead>
            <tbody>
              {data!.ranking.map((r) => (
                <tr key={r.id}>
                  <td>
                    {groupBy === "cultivo" ? (
                      <Link to={`/cultivos/${r.id}`}>{r.nombre}</Link>
                    ) : (
                      <Link to={`/cuadros/${r.id}`}>{r.nombre}</Link>
                    )}
                  </td>
                  <td>{r.campanas}</td>
                  <td>{r.superficieImplantada.toFixed(1)}</td>
                  <td>{money(r.costoDirecto)}</td>
                  <td>{money(r.costoIndirecto)}</td>
                  <td>{money(r.costoTotal)}</td>
                  <td>{money(r.ingresoTotal)}</td>
                  <td style={{ color: r.margenBruto >= 0 ? "var(--color-primary-dark)" : "var(--color-danger)" }}>
                    {money(r.margenBruto)}
                  </td>
                  <td>{r.resultadoPorHa != null ? money(r.resultadoPorHa) : "—"}</td>
                  <td>{r.costoPorKg != null ? money(r.costoPorKg) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function costoIndirectoFields(fincas: Finca[]): FieldSchema[] {
  return [
    {
      name: "fincaId",
      label: "Finca",
      type: "select",
      options: [{ value: "", label: "Todas las fincas" }, ...fincas.map((f) => ({ value: String(f.id), label: f.nombre }))],
    },
    { name: "categoria", label: "Categoría", type: "text", placeholder: "Administración, seguros, sueldos...", required: true },
    { name: "descripcion", label: "Descripción", type: "text" },
    { name: "monto", label: "Monto ($)", type: "number", step: "0.01", required: true },
    { name: "fecha", label: "Fecha", type: "date", required: true },
    { name: "metodoDistribucion", label: "Método de distribución", type: "select", options: METODO_DISTRIBUCION_OPTIONS, required: true },
    { name: "notas", label: "Notas", type: "textarea", fullWidth: true },
  ];
}

function CostosIndirectosTab() {
  const path = "/costos-indirectos";
  const relatedKeys = [path, "/economia/rentabilidad", "/economia/presupuesto"];

  const { data: costos, isLoading } = useList<CostoIndirecto>(path);
  const { data: fincas } = useList<Finca>("/fincas");
  const { data: campanas } = useList<Campana>("/campanas");
  const create = useCreate<CostoIndirecto>(path, relatedKeys);
  const update = useUpdate<CostoIndirecto>(path, relatedKeys);
  const del = useDelete(path, relatedKeys);
  const [modal, setModal] = useState<{ mode: "create" | "edit"; record?: CostoIndirecto } | null>(null);

  const fields = costoIndirectoFields(fincas ?? []);

  return (
    <div>
      <div className="page-header">
        <h3 style={{ margin: 0 }}>Costos indirectos</h3>
        <button className="btn small" onClick={() => setModal({ mode: "create" })}>
          + Agregar
        </button>
      </div>

      {isLoading ? (
        <p className="text-muted">Cargando…</p>
      ) : (
        <RecordList<CostoIndirecto>
          items={costos}
          emptyMessage="Todavía no hay costos indirectos cargados (administración, seguros, sueldos...)."
          columns={[
            { key: "categoria", label: "Categoría" },
            { key: "finca", label: "Finca", render: (c) => fincas?.find((f) => f.id === c.fincaId)?.nombre ?? "Todas" },
            { key: "monto", label: "Monto", render: (c) => money(c.monto) },
            { key: "fecha", label: "Fecha", render: (c) => new Date(c.fecha).toLocaleDateString() },
            {
              key: "metodoDistribucion",
              label: "Método",
              render: (c) => METODO_DISTRIBUCION_OPTIONS.find((o) => o.value === c.metodoDistribucion)?.label ?? c.metodoDistribucion,
            },
          ]}
          onEdit={(c) => setModal({ mode: "edit", record: c })}
          onDelete={(c) => {
            if (confirm("¿Borrar este costo indirecto?")) del.mutate(c.id);
          }}
        />
      )}

      {modal && (
        <Modal title={modal.mode === "create" ? "Nuevo costo indirecto" : "Editar costo indirecto"} onClose={() => setModal(null)}>
          <RecordForm
            fields={fields}
            initial={modal.record && { ...modal.record, fincaId: modal.record.fincaId ? String(modal.record.fincaId) : "" }}
            submitting={create.isPending || update.isPending}
            onCancel={() => setModal(null)}
            onSubmit={(formData) => {
              const payload = { ...formData, fincaId: formData.fincaId ? Number(formData.fincaId) : null };
              if (modal.mode === "create") {
                create.mutate(payload as Partial<CostoIndirecto>, { onSuccess: () => setModal(null) });
              } else if (modal.record) {
                update.mutate({ id: modal.record.id, data: payload }, { onSuccess: () => setModal(null) });
              }
            }}
          />
          {modal.mode === "edit" && modal.record?.metodoDistribucion === "MANUAL" && (
            <AsignacionesManualEditor costoIndirecto={modal.record} campanas={campanas ?? []} />
          )}
        </Modal>
      )}
    </div>
  );
}

/** Editor de asignación manual por campaña (solo para metodoDistribucion = MANUAL). Reemplaza el
 *  set completo en cada guardado — ver PUT /costos-indirectos/:id/asignaciones en el server. */
function AsignacionesManualEditor({ costoIndirecto, campanas }: { costoIndirecto: CostoIndirecto; campanas: Campana[] }) {
  const path = `/costos-indirectos/${costoIndirecto.id}/asignaciones`;
  const qc = useQueryClient();
  const { data } = useQuery<CostoIndirectoAsignacion[]>({
    queryKey: [path],
    queryFn: async () => (await api.get(path)).data,
  });
  const [rows, setRows] = useState<{ campanaId: string; monto: string }[]>([]);

  useEffect(() => {
    if (data) setRows(data.map((a) => ({ campanaId: String(a.campanaId), monto: String(a.monto) })));
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = rows
        .filter((r) => r.campanaId)
        .map((r) => ({ campanaId: Number(r.campanaId), monto: Number(r.monto || 0) }));
      return (await api.put(path, payload)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [path] });
      qc.invalidateQueries({ queryKey: ["/economia/rentabilidad"] });
      qc.invalidateQueries({ queryKey: ["/economia/presupuesto"] });
    },
  });

  const asignado = rows.reduce((s, r) => s + (Number(r.monto) || 0), 0);

  return (
    <div style={{ marginTop: "1rem", borderTop: "1px solid var(--color-border)", paddingTop: "0.75rem" }}>
      <p className="text-muted" style={{ fontSize: "0.8rem", marginBottom: "0.4rem" }}>
        Asignación manual por campaña — monto total {money(costoIndirecto.monto)}, asignado {money(asignado)}
      </p>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "flex", gap: "0.4rem", marginBottom: "0.3rem" }}>
          <select
            value={r.campanaId}
            onChange={(e) => setRows((prev) => prev.map((x, j) => (j === i ? { ...x, campanaId: e.target.value } : x)))}
            style={{ flex: 2 }}
          >
            <option value="">Elegir campaña…</option>
            {campanas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} ({c.cultivo?.nombre ?? "?"} — {c.cuadro?.nombre ?? "?"})
              </option>
            ))}
          </select>
          <input
            type="number"
            step="0.01"
            value={r.monto}
            onChange={(e) => setRows((prev) => prev.map((x, j) => (j === i ? { ...x, monto: e.target.value } : x)))}
            style={{ flex: 1 }}
          />
          <button type="button" className="btn danger small" onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}>
            ×
          </button>
        </div>
      ))}
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.4rem" }}>
        <button
          type="button"
          className="btn secondary small"
          onClick={() => setRows((prev) => [...prev, { campanaId: "", monto: "" }])}
        >
          + Agregar campaña
        </button>
        <button type="button" className="btn small" onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Guardando…" : "Guardar asignaciones"}
        </button>
      </div>
    </div>
  );
}
