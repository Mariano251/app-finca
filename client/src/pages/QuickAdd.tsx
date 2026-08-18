import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useCreate, useList } from "../api/useCrud";
import { createOffline } from "../offline/offlinePost";
import type { Cultivo, Insumo, Organismo, PrincipioActivo, ProductoComercial } from "../api/types";
import { TIPO_FITOSANITARIO_OPTIONS, MOVILIDAD_OPTIONS, CATEGORIA_INSUMO_OPTIONS } from "../constants";
import { parseTextoProducto, type DraftProducto } from "../quickAdd/parseTexto";
import { parseTextoStock, type DraftStock } from "../quickAdd/parseStock";
import { parseComando } from "../quickAdd/comandos";
import type { ExtraccionPdfProducto } from "./biblioteca/ProductoComercialForm";

function labelFor(options: { value: string; label: string }[], value?: string | null) {
  return options.find((o) => o.value === value)?.label ?? value ?? "—";
}

type Resultado = { origen: "biblioteca"; draft: DraftProducto } | { origen: "stock"; draftStock: DraftStock };

/**
 * Carga rápida tipo chat (punto 21 del pedido — "ESTA FUNCIÓN ES MUY IMPORTANTE") + comandos
 * rápidos (punto 23), para Biblioteca (productos/principios activos) y Stock (insumos y sus
 * movimientos). Funciona 100% offline: interpreta el texto contra los catálogos ya cacheados
 * localmente, sin ningún llamado a IA. Nunca guarda datos dudosos sin que el usuario los
 * confirme — ver DATOS DETECTADOS más abajo.
 */
export default function QuickAdd() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const [modo, setModo] = useState<"biblioteca" | "stock">(params.get("modo") === "stock" ? "stock" : "biblioteca");
  const [texto, setTexto] = useState("");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [errorComando, setErrorComando] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Para el caso "insumo no encontrado en el catálogo local" dentro de un movimiento: el usuario
  // completa categoría/unidad a mano antes de guardar (se crea el insumo y el movimiento en una
  // sola confirmación).
  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [nuevaUnidad, setNuevaUnidad] = useState("");
  const [insumoElegidoId, setInsumoElegidoId] = useState<number | null>(null);

  const { data: cultivos } = useList<Cultivo>("/cultivos", { activo: "true" });
  const { data: organismos } = useList<Organismo>("/organismos");
  const { data: principiosActivos } = useList<PrincipioActivo>("/principios-activos");
  const { data: insumos } = useList<Insumo>("/insumos");

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

    setInsumoElegidoId(null);
    if (modo === "stock") {
      const draftStock = parseTextoStock(t, insumos ?? []);
      setNuevaUnidad(draftStock.modo === "movimiento" ? draftStock.draft.unidadMencionada ?? "" : "");
      setNuevaCategoria("");
      setResultado({ origen: "stock", draftStock });
      return;
    }

    setResultado({
      origen: "biblioteca",
      draft: parseTextoProducto(t, {
        cultivos: cultivos ?? [],
        organismos: organismos ?? [],
        principiosActivos: principiosActivos ?? [],
      }),
    });
  }

  function descartar() {
    setResultado(null);
    setTexto("");
    setErrorComando(null);
    setInsumoElegidoId(null);
  }

  function editarEnFormulario() {
    if (!resultado || resultado.origen !== "biblioteca") return;
    const draft = resultado.draft;
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

  function guardarBiblioteca() {
    if (resultado?.origen !== "biblioteca") return;
    const draft = resultado.draft;
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

  async function guardarStock() {
    if (resultado?.origen !== "stock") return;

    if (resultado.draftStock.modo === "insumo_nuevo") {
      const d = resultado.draftStock.draft;
      if (!d.nombre || !d.categoria || !d.unidad) {
        alert("Completá nombre, categoría y unidad antes de guardar (usá EDITAR para ir al formulario completo).");
        return;
      }
      setGuardando(true);
      const insumo = await createOffline<Insumo>(qc, "/insumos", ["/insumos"], {
        nombre: d.nombre,
        categoria: d.categoria,
        unidad: d.unidad,
        stockMinimo: d.stockMinimo,
      });
      setGuardando(false);
      navigate(`/stock/${insumo.id}`);
      return;
    }

    const d = resultado.draftStock.draft;
    if (!d.cantidad) {
      alert("No detecté una cantidad — revisá el texto (ej: \"200 litros de gasoil\").");
      return;
    }

    let insumoId: number | null =
      d.matches.length === 1 ? d.matches[0].id : d.matches.length > 1 ? insumoElegidoId : null;

    setGuardando(true);
    if (!insumoId) {
      if (!d.nombreMencionado || !nuevaCategoria || !nuevaUnidad) {
        setGuardando(false);
        alert("No encontré ese insumo en el catálogo local — completá categoría y unidad para crearlo, o elegí uno existente.");
        return;
      }
      const insumo = await createOffline<Insumo>(qc, "/insumos", ["/insumos"], {
        nombre: d.nombreMencionado,
        categoria: nuevaCategoria,
        unidad: nuevaUnidad,
      });
      insumoId = insumo.id;
    }

    const movimientosPath = `/insumos/${insumoId}/movimientos`;
    await createOffline(qc, movimientosPath, [movimientosPath, "/insumos"], {
      tipo: d.tipo,
      cantidad: d.cantidad,
      fecha: new Date().toISOString().slice(0, 10),
      motivo: d.motivo,
    });
    setGuardando(false);
    navigate(`/stock/${insumoId}`);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to={modo === "stock" ? "/stock" : "/biblioteca"} className="text-muted" style={{ fontSize: "0.85rem" }}>
            ← {modo === "stock" ? "Stock" : "Biblioteca"}
          </Link>
          <h1>⚡ Carga rápida</h1>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
        <button
          type="button"
          className={"btn small" + (modo === "biblioteca" ? "" : " secondary")}
          onClick={() => {
            setModo("biblioteca");
            descartar();
          }}
        >
          🧪 Biblioteca
        </button>
        <button
          type="button"
          className={"btn small" + (modo === "stock" ? "" : " secondary")}
          onClick={() => {
            setModo("stock");
            descartar();
          }}
        >
          📦 Stock
        </button>
      </div>

      <p className="text-muted">
        {modo === "biblioteca"
          ? 'Escribí los datos del producto, ej: "Agregar Movento, spirotetramat 15%, insecticida sistémico, trips y pulgones, ajo y cebolla".'
          : 'Escribí un movimiento de stock, ej: "Entrada 200 litros de gasoil" o "Nuevo insumo Urea 46%, fertilizante, unidad kg, mínimo 50".'}
        {" "}También podés usar comandos (/nuevo producto, /nuevo insumo, /buscar, /comparar, /historial lote &lt;n&gt;). Funciona sin conexión.
      </p>

      <div className="card">
        <div className="field" style={{ marginBottom: "0.5rem" }}>
          <textarea rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} spellCheck={false} />
        </div>
        <button type="button" className="btn" onClick={analizar} disabled={!texto.trim()}>
          Analizar
        </button>
        {errorComando && <p style={{ color: "var(--color-danger, #c0392b)", marginTop: "0.5rem" }}>{errorComando}</p>}
      </div>

      {resultado?.origen === "biblioteca" && (
        <div className="card" style={{ marginTop: "1rem" }}>
          <h3 style={{ marginTop: 0 }}>DATOS DETECTADOS</h3>
          <p className="text-muted" style={{ fontSize: "0.8rem" }}>
            Lectura automática por reglas, sin IA — revisá antes de guardar.
          </p>

          <div className="form-grid" style={{ rowGap: "0.4rem" }}>
            <div>
              <span className="text-muted">Producto: </span>
              {resultado.draft.nombreComercial ?? <em>no detectado</em>}
            </div>
            <div>
              <span className="text-muted">Categorías: </span>
              {resultado.draft.tipos.length > 0 ? (
                resultado.draft.tipos.map((t) => labelFor(TIPO_FITOSANITARIO_OPTIONS, t)).join(", ")
              ) : (
                <em>no detectadas</em>
              )}
            </div>
            <div>
              <span className="text-muted">Movilidad: </span>
              {resultado.draft.movilidad ? labelFor(MOVILIDAD_OPTIONS, resultado.draft.movilidad) : "—"}
            </div>
          </div>

          <div style={{ marginTop: "0.6rem" }}>
            <span className="text-muted">Principios activos: </span>
            {resultado.draft.principios.length === 0 && <em>ninguno detectado</em>}
            <ul style={{ margin: "0.3rem 0 0", paddingLeft: "1.1rem" }}>
              {resultado.draft.principios.map((p, i) => (
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
            {resultado.draft.cultivos.length > 0 ? resultado.draft.cultivos.map((c) => c.nombre).join(", ") : "—"}
          </div>
          <div style={{ marginTop: "0.3rem" }}>
            <span className="text-muted">Plagas/enfermedades/malezas: </span>
            {resultado.draft.organismos.length > 0 ? resultado.draft.organismos.map((o) => o.nombre).join(", ") : "—"}
          </div>

          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
            <button type="button" className="btn" onClick={guardarBiblioteca} disabled={create.isPending}>
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

      {resultado?.origen === "stock" && resultado.draftStock.modo === "movimiento" && (
        <div className="card" style={{ marginTop: "1rem" }}>
          <h3 style={{ marginTop: 0 }}>DATOS DETECTADOS</h3>
          <p className="text-muted" style={{ fontSize: "0.8rem" }}>
            Lectura automática por reglas, sin IA — revisá antes de guardar.
          </p>

          <div className="form-grid" style={{ rowGap: "0.4rem" }}>
            <div>
              <span className="text-muted">Tipo: </span>
              {resultado.draftStock.draft.tipo === "ENTRADA" ? "Entrada" : "Salida (consumo)"}
            </div>
            <div>
              <span className="text-muted">Cantidad: </span>
              {resultado.draftStock.draft.cantidad ?? <em>no detectada</em>}
              {resultado.draftStock.draft.unidadMencionada ? ` ${resultado.draftStock.draft.unidadMencionada}` : ""}
            </div>
          </div>

          <div style={{ marginTop: "0.6rem" }}>
            <span className="text-muted">Insumo: </span>
            {resultado.draftStock.draft.nombreMencionado ?? <em>no detectado</em>}
            {resultado.draftStock.draft.matches.length === 1 && <span> — {resultado.draftStock.draft.matches[0].nombre} ✓</span>}
          </div>

          {resultado.draftStock.draft.matches.length > 1 && (
            <div className="field" style={{ marginTop: "0.5rem" }}>
              <label>Encontré más de un insumo parecido — elegí cuál es:</label>
              <select value={insumoElegidoId ?? ""} onChange={(e) => setInsumoElegidoId(Number(e.target.value) || null)}>
                <option value="">—</option>
                {resultado.draftStock.draft.matches.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre} ({m.unidad})
                  </option>
                ))}
              </select>
            </div>
          )}

          {resultado.draftStock.draft.matches.length === 0 && (
            <div className="card" style={{ marginTop: "0.5rem", background: "var(--color-bg-soft, #f5f7f0)" }}>
              <p style={{ margin: "0 0 0.5rem", fontSize: "0.85rem" }}>
                ⚠️ No encontré ese insumo en el catálogo local. Completá estos datos para crearlo junto con el
                movimiento:
              </p>
              <div className="field">
                <label>Categoría</label>
                <select value={nuevaCategoria} onChange={(e) => setNuevaCategoria(e.target.value)}>
                  <option value="">—</option>
                  {CATEGORIA_INSUMO_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Unidad</label>
                <input type="text" value={nuevaUnidad} onChange={(e) => setNuevaUnidad(e.target.value)} placeholder="L, kg, bolsa…" spellCheck={false} />
              </div>
            </div>
          )}

          {resultado.draftStock.draft.motivo && (
            <div style={{ marginTop: "0.4rem" }}>
              <span className="text-muted">Motivo: </span>
              {resultado.draftStock.draft.motivo}
            </div>
          )}

          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
            <button type="button" className="btn" onClick={guardarStock} disabled={guardando}>
              {guardando ? "Guardando…" : "Guardar"}
            </button>
            <button type="button" className="btn secondary" onClick={() => navigate("/stock")}>
              Editar
            </button>
            <button type="button" className="btn secondary" onClick={descartar}>
              Descartar
            </button>
          </div>
        </div>
      )}

      {resultado?.origen === "stock" && resultado.draftStock.modo === "insumo_nuevo" && (
        <div className="card" style={{ marginTop: "1rem" }}>
          <h3 style={{ marginTop: 0 }}>DATOS DETECTADOS — nuevo insumo</h3>
          <p className="text-muted" style={{ fontSize: "0.8rem" }}>
            Lectura automática por reglas, sin IA — revisá antes de guardar.
          </p>
          <div className="form-grid" style={{ rowGap: "0.4rem" }}>
            <div>
              <span className="text-muted">Nombre: </span>
              {resultado.draftStock.draft.nombre ?? <em>no detectado</em>}
            </div>
            <div>
              <span className="text-muted">Categoría: </span>
              {resultado.draftStock.draft.categoria ? labelFor(CATEGORIA_INSUMO_OPTIONS, resultado.draftStock.draft.categoria) : <em>no detectada</em>}
            </div>
            <div>
              <span className="text-muted">Unidad: </span>
              {resultado.draftStock.draft.unidad ?? <em>no detectada</em>}
            </div>
            <div>
              <span className="text-muted">Stock mínimo: </span>
              {resultado.draftStock.draft.stockMinimo ?? "—"}
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
            <button type="button" className="btn" onClick={guardarStock} disabled={guardando}>
              {guardando ? "Guardando…" : "Guardar"}
            </button>
            <button type="button" className="btn secondary" onClick={() => navigate("/stock")}>
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
