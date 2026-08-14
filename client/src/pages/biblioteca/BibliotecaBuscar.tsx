import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useList } from "../../api/useCrud";
import { EntityPicker } from "../../components/EntityPicker";
import { TIPO_FITOSANITARIO_OPTIONS, TIPO_ORGANISMO_OPTIONS, MOVILIDAD_OPTIONS } from "../../constants";
import type { Cultivo, Organismo, PrincipioActivo, ProductoComercial } from "../../api/types";

/** Cada categoría de producto corresponde a un tipo de organismo objetivo — usado para que, al
 *  elegir un cultivo, los chips "Insecticidas/Acaricidas/Fungicidas/..." (punto 3 del pedido)
 *  filtren directamente la lista de organismos relevantes sin un campo separado a mantener. */
const TIPO_FITO_A_ORGANISMO: Record<string, string> = {
  INSECTICIDA: "PLAGA",
  ACARICIDA: "ACARO",
  FUNGICIDA: "ENFERMEDAD",
  BACTERICIDA: "BACTERIA",
  HERBICIDA: "MALEZA",
  NEMATICIDA: "NEMATODO",
};

function labelFor(options: { value: string; label: string }[], value?: string | null) {
  return options.find((o) => o.value === value)?.label ?? value ?? "—";
}

/**
 * Pantalla de búsqueda combinada de la Biblioteca (puntos 3 y 4 del pedido): cultivo, categoría
 * de producto, organismo objetivo y texto libre se combinan en un único flujo — es una sola
 * pantalla en vez de una por cada punto de entrada (cultivo/plaga/enfermedad/maleza) porque todas
 * terminan mostrando lo mismo (principios activos + productos que coinciden con los filtros).
 */
export default function BibliotecaBuscar() {
  const [params, setParams] = useSearchParams();
  const cultivoId = params.get("cultivoId") ?? "";
  const tipoFito = params.get("tipoFito") ?? "";
  const tipoOrganismo = params.get("tipoOrganismo") ?? "";
  const organismoId = params.get("organismoId") ?? "";
  const [orgQuery, setOrgQuery] = useState("");

  function set(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    setParams(next, { replace: true });
  }

  const { data: cultivos } = useList<Cultivo>("/cultivos", { activo: "true" });
  const tipoOrganismoEfectivo = tipoOrganismo || (tipoFito ? TIPO_FITO_A_ORGANISMO[tipoFito] : "");

  const { data: organismos } = useList<Organismo>("/organismos", {
    tipo: tipoOrganismoEfectivo || undefined,
    cultivoId: cultivoId || undefined,
    q: orgQuery || undefined,
  });

  const hayFiltro = !!(cultivoId || organismoId || tipoOrganismoEfectivo);
  const { data: principios } = useList<PrincipioActivo>(
    "/principios-activos",
    { cultivoId: cultivoId || undefined, organismoId: organismoId || undefined },
    { enabled: hayFiltro }
  );
  const { data: productos } = useList<ProductoComercial>(
    "/productos-comerciales",
    { cultivoId: cultivoId || undefined, organismoId: organismoId || undefined },
    { enabled: hayFiltro }
  );

  const organismoElegido = organismos?.find((o) => String(o.id) === organismoId);

  return (
    <div>
      <div className="page-header">
        <h1>Buscar en la Biblioteca</h1>
      </div>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <div className="form-grid">
          <EntityPicker
            label="Cultivo"
            value={cultivoId}
            onChange={(v) => set({ cultivoId: v || null, organismoId: null })}
            options={(cultivos ?? []).map((c) => ({ value: String(c.id), label: c.nombre }))}
            placeholder="Todos los cultivos"
          />
          <EntityPicker
            label="Tipo de organismo"
            value={tipoOrganismoEfectivo}
            onChange={(v) => set({ tipoOrganismo: v || null, tipoFito: null, organismoId: null })}
            options={TIPO_ORGANISMO_OPTIONS}
            placeholder="Todos"
          />
        </div>

        {cultivoId && (
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", margin: "0.5rem 0" }}>
            {TIPO_FITOSANITARIO_OPTIONS.filter((o) => o.value !== "OTRO").map((o) => (
              <button
                key={o.value}
                type="button"
                className={"btn small" + (tipoFito === o.value ? "" : " secondary")}
                onClick={() => set({ tipoFito: tipoFito === o.value ? null : o.value, tipoOrganismo: null, organismoId: null })}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}

        <div className="field">
          <label>Buscar organismo por nombre</label>
          <input
            type="text"
            value={orgQuery}
            placeholder="ej: trips, Sclerotinia, yuyo colorado…"
            onChange={(e) => setOrgQuery(e.target.value)}
            spellCheck={false}
          />
        </div>

        {(orgQuery || tipoOrganismoEfectivo || cultivoId) && !organismoId && (
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            {(organismos ?? []).slice(0, 40).map((o) => (
              <button key={o.id} type="button" className="btn secondary small" onClick={() => set({ organismoId: String(o.id) })}>
                {o.nombre}
              </button>
            ))}
            {organismos?.length === 0 && <p className="text-muted">Sin coincidencias.</p>}
          </div>
        )}

        {organismoId && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span className="tag">{organismoElegido?.nombre ?? "Organismo"}</span>
            <button type="button" className="btn secondary small" onClick={() => set({ organismoId: null })}>
              Quitar
            </button>
          </div>
        )}
      </div>

      {!hayFiltro && <p className="text-muted">Elegí un cultivo, un tipo de organismo o buscá uno por nombre para ver resultados.</p>}

      {hayFiltro && (
        <>
          <h3>Principios activos ({principios?.length ?? 0})</h3>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", marginBottom: "1.25rem" }}>
            {principios?.map((p) => (
              <Link key={p.id} to={`/biblioteca/principios-activos/${p.id}`} className="card" style={{ textDecoration: "none", color: "inherit" }}>
                <h3 style={{ margin: 0 }}>{p.nombre}</h3>
                <p className="text-muted" style={{ fontSize: "0.85rem", margin: "0.3rem 0" }}>
                  {labelFor(TIPO_FITOSANITARIO_OPTIONS, p.tipo)} · {labelFor(MOVILIDAD_OPTIONS, p.movilidad)}
                </p>
                {p.grupoAccion && <span className="tag">Grupo {p.grupoAccion}</span>}
              </Link>
            ))}
            {hayFiltro && principios?.length === 0 && <p className="text-muted">Sin principios activos cargados para este filtro.</p>}
          </div>

          <h3>Productos comerciales ({productos?.length ?? 0})</h3>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
            {productos?.map((p) => (
              <Link key={p.id} to={`/biblioteca/productos/${p.id}`} className="card" style={{ textDecoration: "none", color: "inherit" }}>
                <h3 style={{ margin: 0 }}>{p.nombreComercial}</h3>
                <p className="text-muted" style={{ fontSize: "0.85rem", margin: "0.3rem 0" }}>
                  {labelFor(TIPO_FITOSANITARIO_OPTIONS, p.tipo)}
                  {!p.disponible ? " · No disponible" : ""}
                </p>
                <p style={{ fontSize: "0.8rem", margin: 0 }}>
                  {p.principiosActivos?.map((r) => r.principioActivo?.nombre).filter(Boolean).join(" + ")}
                </p>
              </Link>
            ))}
            {productos?.length === 0 && <p className="text-muted">Sin productos cargados para este filtro.</p>}
          </div>
        </>
      )}
    </div>
  );
}
