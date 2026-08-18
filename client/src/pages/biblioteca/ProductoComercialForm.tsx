import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { api } from "../../api/client";
import { useCreate, useList, useOne, useUpdate } from "../../api/useCrud";
import type { Cultivo, Organismo, PrincipioActivo, ProductoComercial } from "../../api/types";
import {
  TIPO_FITOSANITARIO_OPTIONS,
  MOVILIDAD_OPTIONS,
  REGISTRO_ARGENTINA_OPTIONS,
  EFICACIA_PRODUCTO_OPTIONS,
} from "../../constants";
import { MultiSelectPicker } from "../../components/MultiSelectPicker";

/** Borrador que arma el servidor al leer un PDF de etiqueta/ficha técnica (ver
 *  POST /productos-comerciales/extraer-pdf) — es "best effort" por reglas, no IA, por eso siempre
 *  se precarga acá para revisión en vez de crearse solo. */
export interface ExtraccionPdfProducto {
  nombreComercial: string | null;
  tipos: string[];
  formulacion: string | null;
  registroArgentina: string | null;
  fuenteInformacion: string | null;
  principiosActivos: { principioActivoId: number; nombre: string; concentracion: number | null; unidad: string | null }[];
  textoInsuficiente: boolean;
}

interface FilaPrincipio {
  key: string;
  principioActivoId: string;
  concentracion: string;
  unidadConcentracion: string;
}

interface FilaOrganismo {
  key: string;
  organismoId: string;
  eficacia: string;
  dosisRecomendada: string;
  dosisMax: string;
  unidadDosis: string;
  baseDosis: string;
  notas: string;
}

let contadorFila = 0;
function nuevaClave() {
  contadorFila += 1;
  return `f${contadorFila}`;
}

function filaPrincipioVacia(): FilaPrincipio {
  return { key: nuevaClave(), principioActivoId: "", concentracion: "", unidadConcentracion: "" };
}

function filaOrganismoVacia(): FilaOrganismo {
  return { key: nuevaClave(), organismoId: "", eficacia: "SIN_EXPERIENCIA", dosisRecomendada: "", dosisMax: "", unidadDosis: "", baseDosis: "", notas: "" };
}

export default function ProductoComercialForm() {
  const { id } = useParams();
  const editando = id !== undefined;
  const productoId = Number(id);
  const navigate = useNavigate();
  const location = useLocation();
  const pdfState = !editando
    ? (location.state as { pdfExtraido?: ExtraccionPdfProducto; pdfFile?: File } | null)
    : null;
  const pdfExtraido = pdfState?.pdfExtraido;
  const pdfFile = pdfState?.pdfFile;

  const { data: existente } = useOne<ProductoComercial>("/productos-comerciales", editando ? productoId : undefined);
  const { data: cultivos } = useList<Cultivo>("/cultivos", { activo: "true" });
  const { data: principiosDisponibles } = useList<PrincipioActivo>("/principios-activos");
  const { data: organismosDisponibles } = useList<Organismo>("/organismos");

  const create = useCreate<ProductoComercial>("/productos-comerciales");
  const update = useUpdate<ProductoComercial>("/productos-comerciales");
  const submitting = create.isPending || update.isPending;

  const [nombreComercial, setNombreComercial] = useState("");
  const [tipos, setTipos] = useState<string[]>([]);
  const [formulacion, setFormulacion] = useState("");
  const [movilidad, setMovilidad] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [disponible, setDisponible] = useState(true);
  const [proveedor, setProveedor] = useState("");
  const [precio, setPrecio] = useState("");
  const [presentacion, setPresentacion] = useState("");
  const [fechaActualizacionPrecio, setFechaActualizacionPrecio] = useState("");
  const [notasPersonales, setNotasPersonales] = useState("");
  const [registroArgentina, setRegistroArgentina] = useState("PENDIENTE");
  const [fuenteInformacion, setFuenteInformacion] = useState("");
  const [fechaVerificacion, setFechaVerificacion] = useState("");
  const [cultivoIds, setCultivoIds] = useState<number[]>([]);
  const [filasPrincipios, setFilasPrincipios] = useState<FilaPrincipio[]>([filaPrincipioVacia()]);
  const [filasOrganismos, setFilasOrganismos] = useState<FilaOrganismo[]>([filaOrganismoVacia()]);

  useEffect(() => {
    if (!existente) return;
    setNombreComercial(existente.nombreComercial);
    setTipos(existente.tipos);
    setFormulacion(existente.formulacion ?? "");
    setMovilidad(existente.movilidad ?? "");
    setObservaciones(existente.observaciones ?? "");
    setDisponible(existente.disponible);
    setProveedor(existente.proveedor ?? "");
    setPrecio(existente.precio != null ? String(existente.precio) : "");
    setPresentacion(existente.presentacion ?? "");
    setFechaActualizacionPrecio(existente.fechaActualizacionPrecio?.slice(0, 10) ?? "");
    setNotasPersonales(existente.notasPersonales ?? "");
    setRegistroArgentina(existente.registroArgentina);
    setFuenteInformacion(existente.fuenteInformacion ?? "");
    setFechaVerificacion(existente.fechaVerificacion?.slice(0, 10) ?? "");
    setCultivoIds((existente.cultivos ?? []).map((c) => c.id));
    setFilasPrincipios(
      existente.principiosActivos && existente.principiosActivos.length > 0
        ? existente.principiosActivos.map((r) => ({
            key: nuevaClave(),
            principioActivoId: String(r.principioActivoId),
            concentracion: r.concentracion != null ? String(r.concentracion) : "",
            unidadConcentracion: r.unidadConcentracion ?? "",
          }))
        : [filaPrincipioVacia()]
    );
    setFilasOrganismos(
      existente.organismos && existente.organismos.length > 0
        ? existente.organismos.map((r) => ({
            key: nuevaClave(),
            organismoId: String(r.organismoId),
            eficacia: r.eficacia,
            dosisRecomendada: r.dosisRecomendada != null ? String(r.dosisRecomendada) : "",
            dosisMax: r.dosisMax != null ? String(r.dosisMax) : "",
            unidadDosis: r.unidadDosis ?? "",
            baseDosis: r.baseDosis ?? "",
            notas: r.notas ?? "",
          }))
        : [filaOrganismoVacia()]
    );
  }, [existente]);

  // Precarga desde un PDF leído en el listado (ver ProductosComercialesList) — sólo al crear, y
  // sólo una vez: no debe pisar lo que el usuario ya haya tocado si vuelve a este efecto.
  useEffect(() => {
    if (!pdfExtraido) return;
    if (pdfExtraido.nombreComercial) setNombreComercial(pdfExtraido.nombreComercial);
    if (pdfExtraido.tipos.length > 0) setTipos(pdfExtraido.tipos);
    if (pdfExtraido.formulacion) setFormulacion(pdfExtraido.formulacion);
    if (pdfExtraido.registroArgentina) setRegistroArgentina(pdfExtraido.registroArgentina);
    if (pdfExtraido.fuenteInformacion) setFuenteInformacion(pdfExtraido.fuenteInformacion);
    if (pdfExtraido.principiosActivos.length > 0) {
      setFilasPrincipios(
        pdfExtraido.principiosActivos.map((p) => ({
          key: nuevaClave(),
          principioActivoId: String(p.principioActivoId),
          concentracion: p.concentracion != null ? String(p.concentracion) : "",
          unidadConcentracion: p.unidad ?? "",
        }))
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (tipos.length === 0) {
      alert("Elegí al menos una categoría (insecticida, fungicida, etc.)");
      return;
    }

    const principiosData = filasPrincipios
      .filter((f) => f.principioActivoId)
      .map((f) => ({
        principioActivoId: Number(f.principioActivoId),
        concentracion: f.concentracion ? Number(f.concentracion) : null,
        unidadConcentracion: f.unidadConcentracion || null,
      }));

    const organismosData = filasOrganismos
      .filter((f) => f.organismoId)
      .map((f) => ({
        organismoId: Number(f.organismoId),
        eficacia: f.eficacia || "SIN_EXPERIENCIA",
        dosisRecomendada: f.dosisRecomendada ? Number(f.dosisRecomendada) : null,
        dosisMax: f.dosisMax ? Number(f.dosisMax) : null,
        unidadDosis: f.unidadDosis || null,
        baseDosis: f.baseDosis || null,
        notas: f.notas || null,
      }));

    const relaciones = editando
      ? {
          cultivos: { set: cultivoIds.map((id) => ({ id })) },
          principiosActivos: { deleteMany: {}, create: principiosData },
          organismos: { deleteMany: {}, create: organismosData },
        }
      : {
          cultivos: { connect: cultivoIds.map((id) => ({ id })) },
          principiosActivos: { create: principiosData },
          organismos: { create: organismosData },
        };

    const body = {
      nombreComercial,
      tipos,
      formulacion: formulacion || null,
      movilidad: movilidad || null,
      observaciones: observaciones || null,
      disponible,
      proveedor: proveedor || null,
      precio: precio ? Number(precio) : null,
      presentacion: presentacion || null,
      fechaActualizacionPrecio: fechaActualizacionPrecio || null,
      notasPersonales: notasPersonales || null,
      registroArgentina,
      fuenteInformacion: fuenteInformacion || null,
      fechaVerificacion: fechaVerificacion || null,
      ...relaciones,
    };

    if (editando) {
      update.mutate(
        { id: productoId, data: body as unknown as Partial<ProductoComercial> },
        { onSuccess: () => navigate(`/biblioteca/productos/${productoId}`) }
      );
    } else {
      create.mutate(body as unknown as Partial<ProductoComercial>, {
        onSuccess: async (creado) => {
          const nuevoId = (creado as ProductoComercial).id;
          if (pdfFile) {
            const form = new FormData();
            form.append("file", pdfFile);
            form.append("entityType", "PRODUCTO_COMERCIAL");
            form.append("entityId", String(nuevoId));
            form.append("descripcion", pdfFile.name);
            // Best effort: si falla el adjunto no bloqueamos la navegación, el producto ya se creó.
            await api.post("/adjuntos", form).catch(() => {});
          }
          navigate(`/biblioteca/productos/${nuevoId}`);
        },
      });
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <Link
            to={editando ? `/biblioteca/productos/${productoId}` : "/biblioteca/productos"}
            className="text-muted"
            style={{ fontSize: "0.85rem" }}
          >
            ← Cancelar
          </Link>
          <h1>{editando ? "Editar producto" : "Nuevo producto comercial"}</h1>
        </div>
      </div>

      {pdfExtraido && (
        <div className="card" style={{ marginBottom: "1rem", background: "var(--color-bg-soft, #f5f7f0)" }}>
          <p style={{ margin: 0, fontSize: "0.85rem" }}>
            📄 Datos precargados desde el PDF — es una lectura automática por reglas, <strong>revisá y corregí</strong> antes
            de guardar (sobre todo dosis y principios activos). El PDF se adjuntará a la ficha como referencia.
          </p>
        </div>
      )}

      <form className="card" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field">
            <label>Nombre comercial *</label>
            <input type="text" value={nombreComercial} onChange={(e) => setNombreComercial(e.target.value)} required spellCheck={false} />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>Categorías * (puede ser más de una, ej. insecticida y acaricida)</label>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              {TIPO_FITOSANITARIO_OPTIONS.map((o) => (
                <label key={o.value} style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.85rem" }}>
                  <input
                    type="checkbox"
                    checked={tipos.includes(o.value)}
                    onChange={(e) =>
                      setTipos((ts) => (e.target.checked ? [...ts, o.value] : ts.filter((t) => t !== o.value)))
                    }
                  />
                  {o.label}
                </label>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Formulación</label>
            <input type="text" value={formulacion} onChange={(e) => setFormulacion(e.target.value)} placeholder="ej: SC, EC, WG" spellCheck={false} />
          </div>
          <div className="field">
            <label>Movilidad</label>
            <select value={movilidad} onChange={(e) => setMovilidad(e.target.value)}>
              <option value="">—</option>
              {MOVILIDAD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Proveedor</label>
            <input type="text" value={proveedor} onChange={(e) => setProveedor(e.target.value)} spellCheck={false} />
          </div>
          <div className="field">
            <label>Presentación</label>
            <input type="text" value={presentacion} onChange={(e) => setPresentacion(e.target.value)} placeholder="ej: bidón 5L" spellCheck={false} />
          </div>
          <div className="field">
            <label>Precio ($)</label>
            <input type="number" step="0.01" value={precio} onChange={(e) => setPrecio(e.target.value)} />
          </div>
          <div className="field">
            <label>Fecha de actualización del precio</label>
            <input type="date" value={fechaActualizacionPrecio} onChange={(e) => setFechaActualizacionPrecio(e.target.value)} />
          </div>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", marginBottom: "0.75rem" }}>
          <input type="checkbox" checked={disponible} onChange={(e) => setDisponible(e.target.checked)} />
          Disponible actualmente
        </label>

        <MultiSelectPicker
          label="Cultivos en los que puede utilizarse"
          values={cultivoIds}
          onChange={setCultivoIds}
          options={(cultivos ?? []).map((c) => ({ value: c.id, label: c.nombre }))}
        />

        <h3 style={{ marginTop: "1rem" }}>Principios activos</h3>
        {filasPrincipios.map((f, i) => (
          <div key={f.key} className="form-grid" style={{ alignItems: "end", marginBottom: "0.4rem" }}>
            <div className="field">
              <label>Principio activo</label>
              <select
                value={f.principioActivoId}
                onChange={(e) => {
                  const v = e.target.value;
                  setFilasPrincipios((fs) => fs.map((x, idx) => (idx === i ? { ...x, principioActivoId: v } : x)));
                }}
              >
                <option value="">—</option>
                {(principiosDisponibles ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Concentración</label>
              <input
                type="number"
                step="0.01"
                value={f.concentracion}
                onChange={(e) => {
                  const v = e.target.value;
                  setFilasPrincipios((fs) => fs.map((x, idx) => (idx === i ? { ...x, concentracion: v } : x)));
                }}
              />
            </div>
            <div className="field">
              <label>Unidad</label>
              <input
                type="text"
                placeholder="g/L, %"
                value={f.unidadConcentracion}
                onChange={(e) => {
                  const v = e.target.value;
                  setFilasPrincipios((fs) => fs.map((x, idx) => (idx === i ? { ...x, unidadConcentracion: v } : x)));
                }}
              />
            </div>
            <button
              type="button"
              className="btn danger small"
              style={{ marginBottom: "0.75rem" }}
              onClick={() => setFilasPrincipios((fs) => fs.filter((_, idx) => idx !== i))}
            >
              Quitar
            </button>
          </div>
        ))}
        <button type="button" className="btn secondary small" onClick={() => setFilasPrincipios((fs) => [...fs, filaPrincipioVacia()])}>
          + Agregar principio activo
        </button>

        <h3 style={{ marginTop: "1.25rem" }}>Plagas / enfermedades / malezas que controla — dosis y eficacia según tu experiencia</h3>
        {filasOrganismos.map((f, i) => (
          <div key={f.key} className="card" style={{ marginBottom: "0.5rem" }}>
            <div className="form-grid">
              <div className="field">
                <label>Organismo</label>
                <select
                  value={f.organismoId}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFilasOrganismos((fs) => fs.map((x, idx) => (idx === i ? { ...x, organismoId: v } : x)));
                  }}
                >
                  <option value="">—</option>
                  {(organismosDisponibles ?? []).map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.nombre} ({o.tipo})
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Eficacia (tu experiencia)</label>
                <select
                  value={f.eficacia}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFilasOrganismos((fs) => fs.map((x, idx) => (idx === i ? { ...x, eficacia: v } : x)));
                  }}
                >
                  {EFICACIA_PRODUCTO_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Dosis mín.</label>
                <input
                  type="number"
                  step="0.01"
                  value={f.dosisRecomendada}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFilasOrganismos((fs) => fs.map((x, idx) => (idx === i ? { ...x, dosisRecomendada: v } : x)));
                  }}
                />
              </div>
              <div className="field">
                <label>Dosis máx.</label>
                <input
                  type="number"
                  step="0.01"
                  value={f.dosisMax}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFilasOrganismos((fs) => fs.map((x, idx) => (idx === i ? { ...x, dosisMax: v } : x)));
                  }}
                />
              </div>
              <div className="field">
                <label>Unidad de dosis</label>
                <input
                  type="text"
                  placeholder="cc/100L, kg/ha"
                  value={f.unidadDosis}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFilasOrganismos((fs) => fs.map((x, idx) => (idx === i ? { ...x, unidadDosis: v } : x)));
                  }}
                />
              </div>
              <div className="field">
                <label>Base de la dosis</label>
                <select
                  value={f.baseDosis}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFilasOrganismos((fs) => fs.map((x, idx) => (idx === i ? { ...x, baseDosis: v } : x)));
                  }}
                >
                  <option value="">—</option>
                  <option value="HECTAREA">Por hectárea</option>
                  <option value="CALDO">Por volumen de caldo</option>
                </select>
              </div>
            </div>
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>Nota personal</label>
              <input
                type="text"
                placeholder="ej: funcionó bien en ajo, no en cebolla"
                value={f.notas}
                onChange={(e) => {
                  const v = e.target.value;
                  setFilasOrganismos((fs) => fs.map((x, idx) => (idx === i ? { ...x, notas: v } : x)));
                }}
                spellCheck={false}
              />
            </div>
            <button type="button" className="btn danger small" onClick={() => setFilasOrganismos((fs) => fs.filter((_, idx) => idx !== i))}>
              Quitar
            </button>
          </div>
        ))}
        <button type="button" className="btn secondary small" onClick={() => setFilasOrganismos((fs) => [...fs, filaOrganismoVacia()])}>
          + Agregar organismo objetivo
        </button>

        <div className="field" style={{ gridColumn: "1 / -1", marginTop: "1rem" }}>
          <label>Observaciones</label>
          <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} spellCheck={false} />
        </div>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label>Notas personales</label>
          <textarea value={notasPersonales} onChange={(e) => setNotasPersonales(e.target.value)} spellCheck={false} />
        </div>

        <div className="form-grid">
          <div className="field">
            <label>Registro/uso en Argentina</label>
            <select value={registroArgentina} onChange={(e) => setRegistroArgentina(e.target.value)}>
              {REGISTRO_ARGENTINA_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Fuente de la información</label>
            <input type="text" value={fuenteInformacion} onChange={(e) => setFuenteInformacion(e.target.value)} spellCheck={false} />
          </div>
          <div className="field">
            <label>Fecha de última verificación</label>
            <input type="date" value={fechaVerificacion} onChange={(e) => setFechaVerificacion(e.target.value)} />
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}
