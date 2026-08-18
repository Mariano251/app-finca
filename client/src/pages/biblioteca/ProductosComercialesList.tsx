import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { useList } from "../../api/useCrud";
import type { ProductoComercial } from "../../api/types";
import { TIPO_FITOSANITARIO_OPTIONS, TIPO_FITOSANITARIO_COLOR } from "../../constants";
import { RegistroBadge } from "../../components/biblioteca/RegistroBadge";
import type { ExtraccionPdfProducto } from "./ProductoComercialForm";

function labelFor(options: { value: string; label: string }[], value?: string | null) {
  return options.find((o) => o.value === value)?.label ?? value ?? "—";
}

interface ImportResultado {
  total: number;
  creados: number;
  actualizados: number;
  errores: string[];
}

export default function ProductosComercialesList() {
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState("");
  const [soloDisponibles, setSoloDisponibles] = useState(false);
  const [soloFavoritos, setSoloFavoritos] = useState(false);
  const [resultadoImport, setResultadoImport] = useState<ImportResultado | null>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useList<ProductoComercial>("/productos-comerciales", {
    q: q || undefined,
    tipo: tipo || undefined,
    disponible: soloDisponibles ? "true" : undefined,
    favorito: soloFavoritos ? "true" : undefined,
  });

  const importar = useMutation({
    mutationFn: async (file: File): Promise<ImportResultado> => {
      const form = new FormData();
      form.append("file", file);
      return (await api.post("/productos-comerciales/import", form)).data;
    },
    onSuccess: (r) => {
      setResultadoImport(r);
      qc.invalidateQueries({ queryKey: ["/productos-comerciales"] });
    },
  });

  const extraerPdf = useMutation({
    mutationFn: async (file: File): Promise<{ extraccion: ExtraccionPdfProducto; file: File }> => {
      const form = new FormData();
      form.append("file", file);
      const extraccion = (await api.post("/productos-comerciales/extraer-pdf", form)).data;
      return { extraccion, file };
    },
    onSuccess: ({ extraccion, file }) => {
      if (extraccion.textoInsuficiente) {
        alert(
          "No se pudo leer texto del PDF (¿es una imagen escaneada?). Se abre el formulario vacío; el PDF se adjuntará a la ficha para tenerlo de referencia."
        );
      }
      navigate("/biblioteca/productos/nuevo", { state: { pdfExtraido: extraccion, pdfFile: file } });
    },
    onError: () => alert("No se pudo leer el PDF. Probá con otro archivo o cargá el producto a mano."),
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/biblioteca" className="text-muted" style={{ fontSize: "0.85rem" }}>
            ← Biblioteca
          </Link>
          <h1>Productos comerciales</h1>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <a className="btn secondary small" href="/api/productos-comerciales/export" download>
            ⬇ Exportar CSV
          </a>
          <label className="btn secondary small" style={{ cursor: "pointer" }}>
            {importar.isPending ? "Importando…" : "⬆ Importar CSV"}
            <input
              type="file"
              accept=".csv,text/csv"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) importar.mutate(file);
                e.target.value = "";
              }}
            />
          </label>
          <label className="btn secondary small" style={{ cursor: "pointer" }}>
            {extraerPdf.isPending ? "Leyendo PDF…" : "📄 Cargar desde PDF"}
            <input
              type="file"
              accept=".pdf,application/pdf"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) extraerPdf.mutate(file);
                e.target.value = "";
              }}
            />
          </label>
          <button className="btn" onClick={() => navigate("/biblioteca/productos/nuevo")}>
            + Nuevo
          </button>
          <button className="btn secondary" onClick={() => navigate("/carga-rapida?modo=biblioteca")}>
            ⚡ Carga rápida
          </button>
        </div>
      </div>

      {resultadoImport && (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <p style={{ margin: 0 }}>
            Importación: {resultadoImport.creados} creado(s), {resultadoImport.actualizados} actualizado(s) de {resultadoImport.total} fila(s).
          </p>
          {resultadoImport.errores.length > 0 && (
            <ul style={{ color: "var(--color-danger)", fontSize: "0.85rem" }}>
              {resultadoImport.errores.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
          <button className="btn secondary small" onClick={() => setResultadoImport(null)}>
            Cerrar
          </button>
        </div>
      )}

      <div className="card" style={{ marginBottom: "1rem" }}>
        <div className="form-grid">
          <div className="field">
            <label>Buscar por nombre</label>
            <input type="text" value={q} onChange={(e) => setQ(e.target.value)} spellCheck={false} />
          </div>
          <div className="field">
            <label>Tipo</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="">Todos</option>
              {TIPO_FITOSANITARIO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: "1rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem" }}>
            <input type="checkbox" checked={soloDisponibles} onChange={(e) => setSoloDisponibles(e.target.checked)} />
            Solo disponibles
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem" }}>
            <input type="checkbox" checked={soloFavoritos} onChange={(e) => setSoloFavoritos(e.target.checked)} />
            Solo favoritos
          </label>
        </div>
      </div>

      {isLoading && <p className="text-muted">Cargando…</p>}
      {!isLoading && data?.length === 0 && <div className="card empty-state">No hay productos cargados.</div>}

      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
        {data?.map((p) => (
          <Link key={p.id} to={`/biblioteca/productos/${p.id}`} className="card" style={{ textDecoration: "none", color: "inherit" }}>
            <h3 style={{ margin: 0 }}>
              {p.favorito ? "⭐ " : ""}
              {p.nombreComercial}
              {!p.disponible && (
                <span className="tag" style={{ marginLeft: "0.4rem", background: "#eee", color: "#666" }}>
                  No disponible
                </span>
              )}
            </h3>
            <p style={{ margin: "0.3rem 0", display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
              {p.tipos.map((t) => (
                <span key={t} className="tag" style={{ background: TIPO_FITOSANITARIO_COLOR[t] + "22", color: TIPO_FITOSANITARIO_COLOR[t] }}>
                  {labelFor(TIPO_FITOSANITARIO_OPTIONS, t)}
                </span>
              ))}
            </p>
            <p style={{ fontSize: "0.85rem", margin: "0 0 0.3rem" }}>
              {p.principiosActivos?.map((r) => r.principioActivo?.nombre).filter(Boolean).join(" + ") || "—"}
            </p>
            <RegistroBadge value={p.registroArgentina} />
          </Link>
        ))}
      </div>
    </div>
  );
}
