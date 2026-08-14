import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useList } from "../../api/useCrud";
import type { PrincipioActivo } from "../../api/types";
import { TIPO_FITOSANITARIO_OPTIONS, TIPO_FITOSANITARIO_COLOR } from "../../constants";
import { RegistroBadge } from "../../components/biblioteca/RegistroBadge";

function labelFor(options: { value: string; label: string }[], value?: string | null) {
  return options.find((o) => o.value === value)?.label ?? value ?? "—";
}

export default function PrincipiosActivosList() {
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState("");
  const [soloFavoritos, setSoloFavoritos] = useState(false);
  const navigate = useNavigate();

  const { data, isLoading } = useList<PrincipioActivo>("/principios-activos", {
    q: q || undefined,
    tipo: tipo || undefined,
    favorito: soloFavoritos ? "true" : undefined,
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/biblioteca" className="text-muted" style={{ fontSize: "0.85rem" }}>
            ← Biblioteca
          </Link>
          <h1>Principios activos</h1>
        </div>
        <button className="btn" onClick={() => navigate("/biblioteca/principios-activos/nuevo")}>
          + Nuevo
        </button>
      </div>

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
        <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem" }}>
          <input type="checkbox" checked={soloFavoritos} onChange={(e) => setSoloFavoritos(e.target.checked)} />
          Solo favoritos
        </label>
      </div>

      {isLoading && <p className="text-muted">Cargando…</p>}
      {!isLoading && data?.length === 0 && <div className="card empty-state">No hay principios activos cargados.</div>}

      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
        {data?.map((p) => (
          <Link key={p.id} to={`/biblioteca/principios-activos/${p.id}`} className="card" style={{ textDecoration: "none", color: "inherit" }}>
            <h3 style={{ margin: 0 }}>
              {p.favorito ? "⭐ " : ""}
              {p.nombre}
            </h3>
            <p style={{ margin: "0.3rem 0" }}>
              <span className="tag" style={{ background: TIPO_FITOSANITARIO_COLOR[p.tipo] + "22", color: TIPO_FITOSANITARIO_COLOR[p.tipo] }}>
                {labelFor(TIPO_FITOSANITARIO_OPTIONS, p.tipo)}
              </span>
              {p.grupoAccion && (
                <span className="tag" style={{ marginLeft: "0.3rem" }}>
                  Grupo {p.grupoAccion}
                </span>
              )}
            </p>
            <RegistroBadge value={p.registroArgentina} />
          </Link>
        ))}
      </div>
    </div>
  );
}
