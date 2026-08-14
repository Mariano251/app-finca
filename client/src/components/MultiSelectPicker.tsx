import { useState } from "react";

/**
 * Selector múltiple con buscador, para relaciones muchos-a-muchos (ej. cultivos u organismos
 * objetivo de un principio activo/producto). `EntityPicker` es de selección única — esto cubre
 * el caso "elegir varios de una lista larga" que no existía antes en la app.
 */
export function MultiSelectPicker({
  label,
  values,
  onChange,
  options,
  placeholder = "Buscar…",
}: {
  label: string;
  values: number[];
  onChange: (values: number[]) => void;
  options: { value: number; label: string }[];
  placeholder?: string;
}) {
  const [filtro, setFiltro] = useState("");

  const seleccionados = options.filter((o) => values.includes(o.value));
  const disponibles = options
    .filter((o) => !values.includes(o.value))
    .filter((o) => o.label.toLowerCase().includes(filtro.toLowerCase()));

  function agregar(value: number) {
    onChange([...values, value]);
    setFiltro("");
  }

  function quitar(value: number) {
    onChange(values.filter((v) => v !== value));
  }

  return (
    <div className="field" style={{ gridColumn: "1 / -1" }}>
      <label>{label}</label>
      {seleccionados.length > 0 && (
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.4rem" }}>
          {seleccionados.map((o) => (
            <span key={o.value} className="tag" style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
              {o.label}
              <button
                type="button"
                onClick={() => quitar(o.value)}
                aria-label={`Quitar ${o.label}`}
                style={{ border: "none", background: "none", cursor: "pointer", padding: 0, lineHeight: 1, fontSize: "0.9rem" }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        type="text"
        value={filtro}
        placeholder={placeholder}
        onChange={(e) => setFiltro(e.target.value)}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
      />
      {filtro && (
        <div
          style={{
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            marginTop: "0.3rem",
            maxHeight: 180,
            overflowY: "auto",
          }}
        >
          {disponibles.length === 0 ? (
            <p className="text-muted" style={{ padding: "0.5rem", margin: 0 }}>
              Sin resultados
            </p>
          ) : (
            disponibles.slice(0, 30).map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => agregar(o.value)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "0.5rem",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                }}
              >
                + {o.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
