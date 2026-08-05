import { useNavigate } from "react-router-dom";
import { useList } from "../../api/useCrud";
import type { Cultivo } from "../../api/types";

export default function CultivoList() {
  const { data: cultivos, isLoading } = useList<Cultivo>("/cultivos");
  const navigate = useNavigate();

  return (
    <div>
      <div className="page-header">
        <h1>Cultivos</h1>
        <span className="text-muted" style={{ fontSize: "0.85rem" }}>
          Los cultivos y variedades se administran en Ajustes
        </span>
      </div>

      {isLoading && <p className="text-muted">Cargando…</p>}
      {!isLoading && (cultivos?.length ?? 0) === 0 && (
        <div className="card empty-state">Todavía no hay cultivos en el catálogo.</div>
      )}

      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
        {cultivos?.map((c) => (
          <div className="card" key={c.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/cultivos/${c.id}`)}>
            <h3 style={{ margin: 0 }}>{c.nombre}</h3>
            {c.nombreCientifico && (
              <p className="text-muted" style={{ fontStyle: "italic", fontSize: "0.85rem" }}>
                {c.nombreCientifico}
              </p>
            )}
            <p style={{ fontSize: "0.85rem" }}>{(c.variedades ?? []).length} variedad(es)</p>
          </div>
        ))}
      </div>
    </div>
  );
}
