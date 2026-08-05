import { useNavigate } from "react-router-dom";
import { useList } from "../../api/useCrud";

interface ProblemaResumen {
  tipo: "enfermedad" | "plaga" | "maleza";
  nombre: string;
  ocurrencias: number;
}

const TIPO_LABEL: Record<ProblemaResumen["tipo"], string> = {
  enfermedad: "Enfermedad",
  plaga: "Plaga",
  maleza: "Maleza",
};

const TIPO_ICON: Record<ProblemaResumen["tipo"], string> = {
  enfermedad: "🦠",
  plaga: "🐛",
  maleza: "🌿",
};

export default function ConocimientoIndex() {
  const { data, isLoading } = useList<ProblemaResumen>("/conocimiento/problemas/lista");
  const navigate = useNavigate();

  return (
    <div>
      <div className="page-header">
        <h1>Base de conocimiento agronómico</h1>
      </div>
      <p className="text-muted">
        Historial de enfermedades, plagas y malezas registradas en la finca: dónde aparecieron,
        cuándo, y qué productos se usaron.
      </p>

      {isLoading && <p className="text-muted">Cargando…</p>}
      {!isLoading && (data?.length ?? 0) === 0 && (
        <div className="card empty-state">
          Todavía no hay problemas registrados. Se completa a medida que cargás enfermedades,
          plagas o malezas en las campañas.
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
        {data?.map((p) => (
          <div
            className="card"
            key={`${p.tipo}-${p.nombre}`}
            style={{ cursor: "pointer" }}
            onClick={() => navigate(`/conocimiento/${p.tipo}/${encodeURIComponent(p.nombre)}`)}
          >
            <h3 style={{ margin: 0 }}>
              {TIPO_ICON[p.tipo]} {p.nombre}
            </h3>
            <p className="text-muted" style={{ fontSize: "0.85rem" }}>
              {TIPO_LABEL[p.tipo]} · {p.ocurrencias} registro(s)
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
