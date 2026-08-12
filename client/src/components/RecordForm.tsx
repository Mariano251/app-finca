import { useState, type FormEvent } from "react";

export interface FieldSchema {
  name: string;
  label: string;
  /** "combobox" = texto libre con sugerencias (datalist) de valores ya cargados: permite elegir
   *  uno existente para no duplicar por error de tipeo, sin impedir escribir uno nuevo. */
  type: "text" | "number" | "date" | "select" | "textarea" | "checkbox" | "combobox";
  options?: { value: string; label: string }[];
  required?: boolean;
  step?: string;
  placeholder?: string;
  fullWidth?: boolean;
}

function toInputValue(type: FieldSchema["type"], raw: unknown) {
  if (raw === null || raw === undefined) return type === "checkbox" ? false : "";
  if (type === "date") return String(raw).slice(0, 10);
  return raw;
}

export function RecordForm({
  fields,
  initial,
  onSubmit,
  onCancel,
  submitLabel = "Guardar",
  submitting,
}: {
  fields: FieldSchema[];
  /** Any plain object (typically a fetched entity) used to prefill the form. */
  initial?: object;
  onSubmit: (data: Record<string, unknown>) => void;
  onCancel?: () => void;
  submitLabel?: string;
  submitting?: boolean;
}) {
  const initialRec = initial as Record<string, unknown> | undefined;
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const v: Record<string, unknown> = {};
    for (const f of fields) v[f.name] = toInputValue(f.type, initialRec?.[f.name]);
    return v;
  });

  function handleChange(name: string, value: unknown) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const out: Record<string, unknown> = {};
    for (const f of fields) {
      const val = values[f.name];
      if (f.type === "number") {
        out[f.name] = val === "" || val === undefined ? null : Number(val);
      } else if (val === "" && f.type !== "checkbox") {
        out[f.name] = null;
      } else {
        out[f.name] = val;
      }
    }
    onSubmit(out);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-grid">
        {fields.map((f) => (
          <div
            className="field"
            key={f.name}
            style={f.fullWidth ? { gridColumn: "1 / -1" } : undefined}
          >
            <label htmlFor={f.name}>
              {f.label}
              {f.required ? " *" : ""}
            </label>
            {f.type === "select" ? (
              <select
                id={f.name}
                value={(values[f.name] as string) ?? ""}
                required={f.required}
                onChange={(e) => handleChange(f.name, e.target.value)}
              >
                <option value="">{f.placeholder ?? "—"}</option>
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : f.type === "textarea" ? (
              <textarea
                id={f.name}
                value={(values[f.name] as string) ?? ""}
                placeholder={f.placeholder}
                onChange={(e) => handleChange(f.name, e.target.value)}
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
              />
            ) : f.type === "combobox" ? (
              <>
                <input
                  id={f.name}
                  type="text"
                  list={`${f.name}-datalist`}
                  value={(values[f.name] as string) ?? ""}
                  required={f.required}
                  placeholder={f.placeholder}
                  onChange={(e) => handleChange(f.name, e.target.value)}
                  spellCheck={false}
                  autoCorrect="off"
                  autoCapitalize="off"
                />
                <datalist id={`${f.name}-datalist`}>
                  {f.options?.map((o) => (
                    <option key={o.value} value={o.value} />
                  ))}
                </datalist>
              </>
            ) : f.type === "checkbox" ? (
              <input
                id={f.name}
                type="checkbox"
                checked={!!values[f.name]}
                onChange={(e) => handleChange(f.name, e.target.checked)}
              />
            ) : (
              <input
                id={f.name}
                type={f.type}
                step={f.step}
                value={(values[f.name] as string | number) ?? ""}
                required={f.required}
                placeholder={f.placeholder}
                onChange={(e) => handleChange(f.name, e.target.value)}
                {...(f.type === "text" ? { spellCheck: false, autoCorrect: "off", autoCapitalize: "off" } : {})}
              />
            )}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
        {onCancel && (
          <button type="button" className="btn secondary" onClick={onCancel}>
            Cancelar
          </button>
        )}
        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? "Guardando…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
