import { Link, useNavigate, useParams } from "react-router-dom";
import { useOne, useUpdate, useDelete } from "../../api/useCrud";
import type { PrincipioActivo } from "../../api/types";
import { TIPO_FITOSANITARIO_OPTIONS, MOVILIDAD_OPTIONS, TIPO_ORGANISMO_OPTIONS } from "../../constants";
import { RegistroBadge } from "../../components/biblioteca/RegistroBadge";

function labelFor(options: { value: string; label: string }[], value?: string | null) {
  return options.find((o) => o.value === value)?.label ?? value ?? "—";
}

export default function PrincipioActivoFicha() {
  const { id } = useParams();
  const principioId = Number(id);
  const navigate = useNavigate();

  const { data: p, isLoading } = useOne<PrincipioActivo>("/principios-activos", principioId);
  const update = useUpdate<PrincipioActivo>("/principios-activos");
  const del = useDelete("/principios-activos");

  if (isLoading) return <p className="text-muted">Cargando…</p>;
  if (!p) return <div className="card empty-state">Principio activo no encontrado.</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/biblioteca/principios-activos" className="text-muted" style={{ fontSize: "0.85rem" }}>
            ← Principios activos
          </Link>
          <h1>{p.nombre}</h1>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn secondary small" onClick={() => update.mutate({ id: p.id, data: { favorito: !p.favorito } })}>
            {p.favorito ? "⭐ Favorito" : "☆ Marcar favorito"}
          </button>
          <button className="btn secondary" onClick={() => navigate(`/biblioteca/principios-activos/${p.id}/editar`)}>
            Editar
          </button>
        </div>
      </div>

      <div className="card">
        <div className="form-grid" style={{ rowGap: "0.4rem" }}>
          <div>
            <span className="text-muted">Tipo de producto: </span>
            {labelFor(TIPO_FITOSANITARIO_OPTIONS, p.tipo)}
          </div>
          <div>
            <span className="text-muted">Movilidad: </span>
            {labelFor(MOVILIDAD_OPTIONS, p.movilidad)}
          </div>
          <div>
            <span className="text-muted">Grupo de acción / resistencia: </span>
            {p.grupoAccion || "—"}
          </div>
        </div>

        <div style={{ marginTop: "0.75rem" }}>
          <RegistroBadge value={p.registroArgentina} />
          {p.fuenteInformacion && (
            <span className="text-muted" style={{ fontSize: "0.8rem", marginLeft: "0.5rem" }}>
              Fuente: {p.fuenteInformacion}
            </span>
          )}
          {p.fechaVerificacion && (
            <span className="text-muted" style={{ fontSize: "0.8rem", marginLeft: "0.5rem" }}>
              Verificado el {new Date(p.fechaVerificacion).toLocaleDateString()}
            </span>
          )}
        </div>

        {p.cultivos && p.cultivos.length > 0 && (
          <p style={{ marginTop: "0.6rem" }}>
            <span className="text-muted">Cultivos: </span>
            {p.cultivos.map((c) => c.nombre).join(", ")}
          </p>
        )}

        {p.organismos && p.organismos.length > 0 && (
          <div style={{ marginTop: "0.6rem" }}>
            <span className="text-muted">Objetivos: </span>
            <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", marginTop: "0.3rem" }}>
              {p.organismos.map((o) => (
                <span key={o.id} className="tag">
                  {labelFor(TIPO_ORGANISMO_OPTIONS, o.tipo)}: {o.nombre}
                </span>
              ))}
            </div>
          </div>
        )}

        {p.observaciones && (
          <p style={{ marginTop: "0.6rem" }}>
            <span className="text-muted">Observaciones técnicas: </span>
            {p.observaciones}
          </p>
        )}
        {p.riesgoResistencia && (
          <p style={{ marginTop: "0.6rem" }}>
            <span className="text-muted">Riesgo de resistencia: </span>
            {p.riesgoResistencia}
          </p>
        )}
        {p.recomendacionRotacion && (
          <p style={{ marginTop: "0.6rem" }}>
            <span className="text-muted">Recomendación de rotación: </span>
            {p.recomendacionRotacion}
          </p>
        )}

        <button
          className="btn danger small"
          style={{ marginTop: "0.75rem" }}
          onClick={() => {
            if (confirm(`¿Borrar el principio activo "${p.nombre}"?`)) {
              del.mutate(p.id, { onSuccess: () => navigate("/biblioteca/principios-activos") });
            }
          }}
        >
          Borrar
        </button>
      </div>

      <div className="page-header" style={{ marginTop: "1.25rem" }}>
        <h2>Productos comerciales que lo contienen</h2>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
        {(p.productos ?? []).length === 0 && <p className="text-muted">Ningún producto cargado todavía.</p>}
        {p.productos?.map((rel) => (
          <Link
            key={rel.id}
            to={`/biblioteca/productos/${rel.productoComercialId}`}
            className="card"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <h3 style={{ margin: 0 }}>{rel.productoComercial?.nombreComercial}</h3>
            {rel.concentracion != null && (
              <p className="text-muted" style={{ fontSize: "0.85rem", margin: "0.3rem 0" }}>
                {rel.concentracion} {rel.unidadConcentracion ?? ""}
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
