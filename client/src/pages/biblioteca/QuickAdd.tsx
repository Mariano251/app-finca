import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCreate, useList } from "../../api/useCrud";
import type { Cultivo, Organismo, PrincipioActivo, ProductoComercial } from "../../api/types";
import { TIPO_FITOSANITARIO_OPTIONS, MOVILIDAD_OPTIONS } from "../../constants";
import { parseTextoProducto, type DraftProducto } from "./quickAdd/parseTexto";
import { parseComando } from "./quickAdd/comandos";
import type { ExtraccionPdfProducto } from "./ProductoComercialForm";

function labelFor(options: { value: string; label: string }[], value?: string | null) {
  return options.find((o) => o.value === value)?.label ?? value ?? "—";
}

/**
 * Carga rápida tipo chat (punto 21 del pedido — "ESTA FUNCIÓN ES MUY IMPORTANTE") + comandos
 * rápidos (punto 23). Funciona 100% offline: interpreta el texto contra los catálogos de
 * Cultivo/Organismo/PrincipioActivo ya cacheados localmente (useList ya sale del cache persistido
 * si no hay señal), sin ningún llamado a IA. Nunca guarda datos dudosos sin que el usuario los
 * confirme — ver DATOS DETECTADOS más abajo.
 */
export default function QuickAdd() {
  const navigate = useNavigate();
  const [texto, setTexto] = useState("");
  const [draft, setDraft] = useState<DraftProducto | null>(null);
  const [errorComando, setErrorComando] = useState<string | null>(null);

  const { data: cultivos } = useList<Cultivo>("/cultivos", { activo: "true" });
  const { data: organismos } = useList<Organismo>("/organismos");
  const { data: principiosActivos } = useList<PrincipioActivo>("/principios-activos");

  const create = useCreate<ProductoComercial>("/productos-comerciales");

  function analizar() {
    setErrorComando(null);
    const t = texto.trim();
    if (!t) return;

    const comando = parseComando(t, principiosActivos ?? []);
    if (comando) {
      if (comando.tipo === "navegar") navigate(comando.to);
      else setErrorComando(comando.mensaje);
      return;
    }

    setDraft(
      parseTextoProducto(t, {
        cultivos: cultivos ?? [],
        organismos: organismos ?? [],
        principiosActivos: principiosActivos ?? [],
      })
    );
  }

  function descartar() {
    setDraft(null);
    setTexto("");
    setErrorComando(null);
  }

  function editarEnFormulario() {
    if (!draft) return;
    const pdfExtraido: ExtraccionPdfProducto = {
      nombreComercial: draft.nombreComercial,
      tipos: draft.tipos,
      formulacion: null,
      registroArgentina: null,
      fuenteInformacion: "Carga rápida (texto del usuario)",
      principiosActivos: draft.principios
        .filter((p) => p.matches.length === 1)
        .map((p) => ({
          principioActivoId: p.matches[0].id,
          nombre: p.matches[0].nombre,
          concentracion: p.concentracion,
          unidad: p.concentracion != null ? "%" : null,
        })),
      textoInsuficiente: false,
    };
    navigate("/biblioteca/productos/nuevo", { state: { pdfExtraido } });
  }

  function guardar() {
    if (!draft) return;
    if (!draft.nombreComercial || draft.tipos.length === 0) {
      alert("Falta el nombre comercial o la categoría — usá EDITAR para completarlo en el formulario.");
      return;
    }
    const principiosConfirmados = draft.principios.filter((p) => p.matches.length === 1);
    const body = {
      nombreComercial: draft.nombreComercial,
      tipos: draft.tipos,
      movilidad: draft.movilidad,
      registroArgentina: "PENDIENTE",
      fuenteInformacion: "Carga rápida (texto del usuario) — verificar etiqueta vigente",
      disponible: true,
      cultivos: { connect: draft.cultivos.map((c) => ({ id: c.id })) },
      principiosActivos: {
        create: principiosConfirmados.map((p) => ({
          principioActivoId: p.matches[0].id,
          concentracion: p.concentracion,
          unidadConcentracion: p.concentracion != null ? "%" : null,
        })),
      },
      organismos: {
        create: draft.organismos.map((o) => ({ organismoId: o.id, eficacia: "SIN_EXPERIENCIA" })),
      },
    };
    create.mutate(body as unknown as Partial<ProductoComercial>, {
      onSuccess: (creado) => navigate(`/biblioteca/productos/${(creado as ProductoComercial).id}`),
    });
  }

  const hayAmbiguos = draft?.principios.some((p) => p.matches.length !== 1) ?? false;

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/biblioteca" className="text-muted" style={{ fontSize: "0.85rem" }}>
            ← Biblioteca
          </Link>
          <h1>⚡ Carga rápida</h1>
        </div>
      </div>

      <p className="text-muted">
        Escribí los datos del producto de la forma que quieras, o un comando (/nuevo producto, /nuevo principio,
        /buscar, /comparar, /historial lote &lt;n&gt;). Funciona sin conexión.
      </p>

      <div className="card">
        <div className="field" style={{ marginBottom: "0.5rem" }}>
          <textarea
            rows={3}
            value={texto}
            placeholder='ej: "Agregar Movento, spirotetramat 15%, insecticida sistémico, trips y pulgones, ajo y cebolla"'
            onChange={(e) => setTexto(e.target.value)}
            spellCheck={false}
          />
        </div>
        <button type="button" className="btn" onClick={analizar} disabled={!texto.trim()}>
          Analizar
        </button>
        {errorComando && (
          <p style={{ color: "var(--color-danger, #c0392b)", marginTop: "0.5rem" }}>{errorComando}</p>
        )}
      </div>

      {draft && (
        <div className="card" style={{ marginTop: "1rem" }}>
          <h3 style={{ marginTop: 0 }}>DATOS DETECTADOS</h3>
          <p className="text-muted" style={{ fontSize: "0.8rem" }}>
            Lectura automática por reglas, sin IA — revisá antes de guardar.
          </p>

          <div className="form-grid" style={{ rowGap: "0.4rem" }}>
            <div>
              <span className="text-muted">Producto: </span>
              {draft.nombreComercial ?? <em>no detectado</em>}
            </div>
            <div>
              <span className="text-muted">Categorías: </span>
              {draft.tipos.length > 0 ? draft.tipos.map((t) => labelFor(TIPO_FITOSANITARIO_OPTIONS, t)).join(", ") : <em>no detectadas</em>}
            </div>
            <div>
              <span className="text-muted">Movilidad: </span>
              {draft.movilidad ? labelFor(MOVILIDAD_OPTIONS, draft.movilidad) : "—"}
            </div>
          </div>

          <div style={{ marginTop: "0.6rem" }}>
            <span className="text-muted">Principios activos: </span>
            {draft.principios.length === 0 && <em>ninguno detectado</em>}
            <ul style={{ margin: "0.3rem 0 0", paddingLeft: "1.1rem" }}>
              {draft.principios.map((p, i) => (
                <li key={i}>
                  {p.textoOriginal}
                  {p.concentracion != null && ` ${p.concentracion}%`}
                  {p.matches.length === 1 && <span> — {p.matches[0].nombre} ✓</span>}
                  {p.matches.length === 0 && (
                    <span style={{ color: "var(--color-warning)" }}> — no está en la biblioteca local todavía</span>
                  )}
                  {p.matches.length > 1 && (
                    <span style={{ color: "var(--color-warning)" }}>
                      {" "}
                      — encontré más de una posibilidad: {p.matches.map((m) => m.nombre).join(", ")}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div style={{ marginTop: "0.6rem" }}>
            <span className="text-muted">Cultivos: </span>
            {draft.cultivos.length > 0 ? draft.cultivos.map((c) => c.nombre).join(", ") : "—"}
          </div>
          <div style={{ marginTop: "0.3rem" }}>
            <span className="text-muted">Plagas/enfermedades/malezas: </span>
            {draft.organismos.length > 0 ? draft.organismos.map((o) => o.nombre).join(", ") : "—"}
          </div>

          {hayAmbiguos && (
            <p style={{ color: "var(--color-warning)", marginTop: "0.6rem" }}>
              ⚠️ Hay principios activos ambiguos o no encontrados — usá EDITAR para resolverlos a mano antes de
              guardar, o guardá igual y completalos después en la ficha.
            </p>
          )}

          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
            <button type="button" className="btn" onClick={guardar} disabled={create.isPending}>
              {create.isPending ? "Guardando…" : "Guardar"}
            </button>
            <button type="button" className="btn secondary" onClick={editarEnFormulario}>
              Editar
            </button>
            <button type="button" className="btn secondary" onClick={descartar}>
              Descartar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
