import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useList } from "../../api/useCrud";
import type { Organismo, ProductoComercial } from "../../api/types";

const TIPO_ICON: Record<string, string> = {
  PLAGA: "🐛",
  ACARO: "🕷️",
  ENFERMEDAD: "🦠",
  BACTERIA: "🧫",
  MALEZA: "🌿",
  NEMATODO: "🪱",
};

const ACCESOS = [
  { to: "/biblioteca/buscar", icon: "🌾", label: "Por cultivo" },
  { to: "/biblioteca/buscar?tipoOrganismo=PLAGA", icon: TIPO_ICON.PLAGA, label: "Por plaga" },
  { to: "/biblioteca/buscar?tipoOrganismo=ENFERMEDAD", icon: TIPO_ICON.ENFERMEDAD, label: "Por enfermedad" },
  { to: "/biblioteca/buscar?tipoOrganismo=MALEZA", icon: TIPO_ICON.MALEZA, label: "Por maleza" },
  { to: "/biblioteca/principios-activos", icon: "🧪", label: "Principio activo" },
  { to: "/biblioteca/productos", icon: "🧴", label: "Producto comercial" },
];

export default function BibliotecaIndex() {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const { data: organismos } = useList<Organismo>("/organismos", { q: q || undefined }, { enabled: q.length >= 3 });
  const { data: recientes } = useList<ProductoComercial>("/productos-comerciales", { recientes: "true", limit: 8 });

  return (
    <div>
      <div className="page-header">
        <h1>📗 Biblioteca de Productos y Principios Activos</h1>
      </div>
      <p className="text-muted">
        Consulta técnica de fitosanitarios: qué principios activos y productos existen, qué controlan y en qué
        cultivos se usan — con tu propia experiencia de dosis y eficacia registrada al lado de cada uno.
      </p>

      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Buscar una plaga, enfermedad, maleza, ácaro, bacteria o nematodo</label>
          <input
            type="text"
            value={q}
            placeholder="ej: trips, Sclerotinia, yuyo colorado…"
            onChange={(e) => setQ(e.target.value)}
            spellCheck={false}
          />
        </div>
        {q.length >= 3 && (
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.6rem" }}>
            {(organismos ?? []).slice(0, 20).map((o) => (
              <button
                key={o.id}
                type="button"
                className="btn secondary small"
                onClick={() => navigate(`/biblioteca/buscar?organismoId=${o.id}&tipoOrganismo=${o.tipo}`)}
              >
                {TIPO_ICON[o.tipo]} {o.nombre}
              </button>
            ))}
            {organismos?.length === 0 && <p className="text-muted">Sin coincidencias en la Biblioteca.</p>}
          </div>
        )}
      </div>

      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
        {ACCESOS.map((a) => (
          <Link key={a.to} to={a.to} className="quick-tile">
            <span className="quick-tile-icon">{a.icon}</span>
            <span className="quick-tile-label">{a.label}</span>
          </Link>
        ))}
      </div>

      <div style={{ marginTop: "1.25rem" }}>
        <Link to="/biblioteca/comparar" className="btn secondary small">
          ⚖️ Comparar principios activos
        </Link>
      </div>

      {recientes && recientes.length > 0 && (
        <>
          <div className="page-header" style={{ marginTop: "1.5rem" }}>
            <h2>Usados recientemente</h2>
          </div>
          <div style={{ display: "flex", gap: "0.6rem", overflowX: "auto", paddingBottom: "0.3rem" }}>
            {recientes.map((p) => (
              <Link
                key={p.id}
                to={`/biblioteca/productos/${p.id}`}
                className="card"
                style={{ textDecoration: "none", color: "inherit", minWidth: 160, flexShrink: 0 }}
              >
                <strong>{p.nombreComercial}</strong>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
