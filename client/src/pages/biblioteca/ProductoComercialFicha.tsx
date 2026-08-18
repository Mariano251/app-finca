import { Link, useNavigate, useParams } from "react-router-dom";
import { useOne, useUpdate, useDelete } from "../../api/useCrud";
import type { ProductoComercial } from "../../api/types";
import { TIPO_FITOSANITARIO_OPTIONS, MOVILIDAD_OPTIONS, TIPO_ORGANISMO_OPTIONS, EFICACIA_PRODUCTO_OPTIONS } from "../../constants";
import { RegistroBadge } from "../../components/biblioteca/RegistroBadge";
import { DocumentAttachments } from "../../components/biblioteca/DocumentAttachments";

function labelFor(options: { value: string; label: string }[], value?: string | null) {
  return options.find((o) => o.value === value)?.label ?? value ?? "—";
}

const EFICACIA_COLOR: Record<string, string> = {
  EFECTIVO: "#2c5a2c",
  EFECTIVO_PARCIAL: "#8a6d1f",
  NO_EFECTIVO: "#b3413a",
  SIN_EXPERIENCIA: "#666",
};

export default function ProductoComercialFicha() {
  const { id } = useParams();
  const productoId = Number(id);
  const navigate = useNavigate();

  const { data: p, isLoading } = useOne<ProductoComercial>("/productos-comerciales", productoId);
  const update = useUpdate<ProductoComercial>("/productos-comerciales");
  const del = useDelete("/productos-comerciales");

  if (isLoading) return <p className="text-muted">Cargando…</p>;
  if (!p) return <div className="card empty-state">Producto no encontrado.</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/biblioteca/productos" className="text-muted" style={{ fontSize: "0.85rem" }}>
            ← Productos comerciales
          </Link>
          <h1>{p.nombreComercial}</h1>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn secondary small" onClick={() => update.mutate({ id: p.id, data: { favorito: !p.favorito } })}>
            {p.favorito ? "⭐ Favorito" : "☆ Marcar favorito"}
          </button>
          <button className="btn secondary" onClick={() => navigate(`/biblioteca/productos/${p.id}/editar`)}>
            Editar
          </button>
        </div>
      </div>

      <div className="card">
        <div className="form-grid" style={{ rowGap: "0.4rem" }}>
          <div>
            <span className="text-muted">Categorías: </span>
            {p.tipos.map((t) => labelFor(TIPO_FITOSANITARIO_OPTIONS, t)).join(", ") || "—"}
          </div>
          <div>
            <span className="text-muted">Formulación: </span>
            {p.formulacion || "—"}
          </div>
          <div>
            <span className="text-muted">Movilidad: </span>
            {labelFor(MOVILIDAD_OPTIONS, p.movilidad)}
          </div>
          <div>
            <span className="text-muted">Disponible: </span>
            {p.disponible ? "Sí" : "No"}
          </div>
          <div>
            <span className="text-muted">Proveedor: </span>
            {p.proveedor || "—"}
          </div>
          <div>
            <span className="text-muted">Presentación: </span>
            {p.presentacion || "—"}
          </div>
          <div>
            <span className="text-muted">Precio: </span>
            {p.precio != null ? p.precio.toLocaleString("es-AR", { style: "currency", currency: "ARS" }) : "—"}
            {p.fechaActualizacionPrecio && (
              <span className="text-muted" style={{ fontSize: "0.8rem" }}>
                {" "}
                (actualizado {new Date(p.fechaActualizacionPrecio).toLocaleDateString()})
              </span>
            )}
          </div>
        </div>

        <div style={{ marginTop: "0.75rem" }}>
          <RegistroBadge value={p.registroArgentina} />
        </div>

        {p.principiosActivos && p.principiosActivos.length > 0 && (
          <div style={{ marginTop: "0.6rem" }}>
            <span className="text-muted">Principios activos: </span>
            <ul style={{ margin: "0.3rem 0 0", paddingLeft: "1.2rem" }}>
              {p.principiosActivos.map((rel) => (
                <li key={rel.id}>
                  <Link to={`/biblioteca/principios-activos/${rel.principioActivoId}`}>{rel.principioActivo?.nombre}</Link>
                  {rel.concentracion != null && ` — ${rel.concentracion} ${rel.unidadConcentracion ?? ""}`}
                </li>
              ))}
            </ul>
          </div>
        )}

        {p.cultivos && p.cultivos.length > 0 && (
          <p style={{ marginTop: "0.6rem" }}>
            <span className="text-muted">Cultivos: </span>
            {p.cultivos.map((c) => c.nombre).join(", ")}
          </p>
        )}

        {p.observaciones && (
          <p style={{ marginTop: "0.6rem" }}>
            <span className="text-muted">Observaciones: </span>
            {p.observaciones}
          </p>
        )}
        {p.notasPersonales && (
          <p style={{ marginTop: "0.6rem" }}>
            <span className="text-muted">Notas personales: </span>
            {p.notasPersonales}
          </p>
        )}

        <button
          className="btn danger small"
          style={{ marginTop: "0.75rem" }}
          onClick={() => {
            if (confirm(`¿Borrar el producto "${p.nombreComercial}"?`)) {
              del.mutate(p.id, { onSuccess: () => navigate("/biblioteca/productos") });
            }
          }}
        >
          Borrar
        </button>
      </div>

      <div className="page-header" style={{ marginTop: "1.25rem" }}>
        <h2>Eficacia y dosis por plaga/enfermedad/maleza (tu experiencia)</h2>
      </div>
      <div className="card">
        <p className="text-muted" style={{ fontSize: "0.8rem" }}>
          No es lo que dice la ficha técnica — es lo que vos observaste en el campo. Se edita desde "Editar".
        </p>
        {(p.organismos ?? []).length === 0 && <p className="text-muted">Todavía no cargaste organismos objetivo.</p>}
        {(p.organismos?.length ?? 0) > 0 && (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Organismo</th>
                  <th>Eficacia</th>
                  <th>Dosis</th>
                  <th>Notas</th>
                </tr>
              </thead>
              <tbody>
                {p.organismos?.map((rel) => (
                  <tr key={rel.id}>
                    <td>{labelFor(TIPO_ORGANISMO_OPTIONS, rel.organismo?.tipo)}</td>
                    <td>{rel.organismo?.nombre}</td>
                    <td>
                      <span style={{ color: EFICACIA_COLOR[rel.eficacia] }}>{labelFor(EFICACIA_PRODUCTO_OPTIONS, rel.eficacia)}</span>
                    </td>
                    <td>
                      {rel.dosisRecomendada != null
                        ? `${rel.dosisRecomendada}${rel.dosisMax != null ? `–${rel.dosisMax}` : ""} ${rel.unidadDosis ?? ""}`
                        : "—"}
                    </td>
                    <td>{rel.notas || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="page-header" style={{ marginTop: "1.25rem" }}>
        <h2>Etiqueta / ficha técnica</h2>
      </div>
      <div className="card">
        <DocumentAttachments entityType="PRODUCTO_COMERCIAL" entityId={p.id} />
      </div>
    </div>
  );
}
