import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { useCreate, useDelete, useList, useOne, useUpdate } from "../../api/useCrud";
import type { Croquis, CroquisPoligono, Cuadro, Enfermedad, Finca, Maleza } from "../../api/types";
import { CroquisStage, type CroquisTool, type Point } from "../../components/croquis/CroquisStage";
import { AssignCuadroModal } from "../../components/croquis/AssignCuadroModal";
import { CalibrateScaleModal } from "../../components/croquis/CalibrateScaleModal";
import { RectanguloPorMedidasModal } from "../../components/croquis/RectanguloPorMedidasModal";
import {
  MarcarRegistroModal,
  type MarcarRegistroResult,
  type TipoRegistroCroquis,
} from "../../components/croquis/MarcarRegistroModal";
import { colorForCultivo, colorForNivelInfestacion, resolveImageUrl } from "../../constants";
import {
  buildRectanglePoints,
  distanceMeters,
  formatArea,
  hasScale,
  pointInPolygon,
  polygonAreaM2,
} from "../../components/croquis/geometry";
import { isConnectivityError } from "../../offline/isConnectivityError";
import { enqueueCreate, enqueueCroquisImage } from "../../offline/queue";
import { applyOptimisticCreate, applyOptimisticUpdate } from "../../offline/cachePatch";
import { scheduleSync } from "../../offline/sync";

type FiltroCapa = "todas" | "activa" | "ultima";

interface RegistroConCampana {
  campanaId: number;
  campana?: { estado: string; cuadroId: number; fechaPlantacion?: string | null } | null;
}

/** Filtro temporal compartido por las capas de enfermedades y malezas del croquis: permite
 *  ocultar historial viejo para que el mapa no se sature con años de marcas superpuestas. */
function filtrarPorCapa<T extends RegistroConCampana>(lista: T[], filtro: FiltroCapa): T[] {
  if (filtro === "todas") return lista;
  if (filtro === "activa") return lista.filter((r) => r.campana?.estado === "ACTIVA");

  const ultimaPorCuadro = new Map<number, { campanaId: number; fecha: number }>();
  for (const r of lista) {
    const cuadroId = r.campana?.cuadroId;
    if (!cuadroId) continue;
    const fecha = r.campana?.fechaPlantacion ? new Date(r.campana.fechaPlantacion).getTime() : 0;
    const actual = ultimaPorCuadro.get(cuadroId);
    if (!actual || fecha > actual.fecha) ultimaPorCuadro.set(cuadroId, { campanaId: r.campanaId, fecha });
  }
  return lista.filter((r) => {
    const cuadroId = r.campana?.cuadroId;
    return !!cuadroId && ultimaPorCuadro.get(cuadroId)?.campanaId === r.campanaId;
  });
}

export default function CroquisPage() {
  const { id } = useParams();
  const fincaId = Number(id);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: finca } = useOne<Finca>("/fincas", fincaId);
  const { data: croquisList, isLoading } = useList<Croquis>("/croquis", { fincaId });
  const { data: cuadros } = useList<Cuadro>("/cuadros", { fincaId });

  const croquis = croquisList?.[0];

  const createCroquis = useCreate<Croquis>("/croquis");
  const updateCroquis = useUpdate<Croquis>("/croquis");
  const deleteCroquis = useDelete("/croquis");
  void deleteCroquis;

  const uploadImage = useMutation({
    mutationFn: async ({ croquisId, file }: { croquisId: number; file: File }): Promise<Croquis> => {
      const form = new FormData();
      form.append("file", file);
      try {
        return (await api.post(`/croquis/${croquisId}/imagen`, form)).data;
      } catch (error) {
        if (!isConnectivityError(error)) throw error;
        // Sin conexión: se guarda el archivo en IndexedDB y se muestra desde un object URL local
        // hasta poder subirlo de verdad al reconectar (ver offline/sync.ts).
        await enqueueCroquisImage(croquisId, file);
        const objectUrl = URL.createObjectURL(file);
        return applyOptimisticUpdate(qc, "/croquis", croquisId, { imagenPath: objectUrl }) as Croquis;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/croquis"] });
      scheduleSync(qc);
    },
  });

  const createPoligono = useCreate<CroquisPoligono>(
    croquis ? `/croquis/${croquis.id}/poligonos` : "/croquis/_/poligonos",
    ["/croquis"]
  );
  const updatePoligono = useUpdate<CroquisPoligono>("/poligonos", ["/croquis"]);
  const deletePoligono = useDelete("/poligonos", ["/croquis"]);

  // La campaña destino se elige recién dentro del modal de "marcar enfermedad", así que no puede
  // ser un `useCreate` de resource fijo (como el resto de los subregistros) — se arma la URL en
  // el momento, mismo patrón try/catch offline que `uploadImage`.
  const createEnfermedad = useMutation({
    mutationFn: async ({ campanaId, data }: { campanaId: number; data: Partial<Enfermedad> }): Promise<Enfermedad> => {
      const resource = `/campanas/${campanaId}/enfermedades`;
      try {
        return (await api.post(resource, data)).data;
      } catch (error) {
        if (!isConnectivityError(error)) throw error;
        const { tempId } = await enqueueCreate(resource, ["/croquis"], data as Record<string, unknown>);
        return applyOptimisticCreate(qc, resource, tempId, data as Record<string, unknown>) as Enfermedad;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/croquis"] });
      scheduleSync(qc);
    },
  });
  const updateEnfermedad = useUpdate<Enfermedad>("/enfermedades", ["/croquis"]);

  const createMaleza = useMutation({
    mutationFn: async ({ campanaId, data }: { campanaId: number; data: Partial<Maleza> }): Promise<Maleza> => {
      const resource = `/campanas/${campanaId}/malezas`;
      try {
        return (await api.post(resource, data)).data;
      } catch (error) {
        if (!isConnectivityError(error)) throw error;
        const { tempId } = await enqueueCreate(resource, ["/croquis"], data as Record<string, unknown>);
        return applyOptimisticCreate(qc, resource, tempId, data as Record<string, unknown>) as Maleza;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/croquis"] });
      scheduleSync(qc);
    },
  });
  const updateMaleza = useUpdate<Maleza>("/malezas", ["/croquis"]);

  const [mode, setMode] = useState<"ver" | "editar">("ver");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [tool, setTool] = useState<CroquisTool>(null);
  const [draft, setDraft] = useState<Point[]>([]);
  const [assignModal, setAssignModal] = useState<null | "new" | "reassign">(null);
  const [calibrateModal, setCalibrateModal] = useState<{ puntoA: Point; puntoB: Point } | null>(null);
  const [rectModalOpen, setRectModalOpen] = useState(false);
  const [pendingRect, setPendingRect] = useState<{ anchoM: number; altoM: number } | null>(null);
  const [registroModal, setRegistroModal] = useState<
    { tipo: TipoRegistroCroquis; centro: Point; borde: Point } | null
  >(null);
  const [showHistorial, setShowHistorial] = useState(false);
  const [capaEnfermedades, setCapaEnfermedades] = useState(true);
  const [filtroEnfermedad, setFiltroEnfermedad] = useState<FiltroCapa>("todas");
  const [capaMalezas, setCapaMalezas] = useState(true);
  const [filtroMaleza, setFiltroMaleza] = useState<FiltroCapa>("todas");
  const [localPoligonos, setLocalPoligonos] = useState<CroquisPoligono[]>([]);
  const draggingRef = useRef(false);

  useEffect(() => {
    if (!draggingRef.current && croquis?.poligonos) setLocalPoligonos(croquis.poligonos);
  }, [croquis?.poligonos]);

  if (isLoading) return <p className="text-muted">Cargando…</p>;

  if (!croquis) {
    return (
      <div>
        <PageHeader finca={finca} />
        <div className="card empty-state">
          <p>Todavía no hay un croquis para esta finca.</p>
          <button
            className="btn"
            onClick={() => createCroquis.mutate({ fincaId, nombre: "Croquis principal" })}
          >
            + Crear croquis
          </button>
        </div>
      </div>
    );
  }

  if (!croquis.imagenPath) {
    return (
      <div>
        <PageHeader finca={finca} />
        <div className="card empty-state">
          <p>Subí una foto, plano o captura satelital de la finca como fondo del croquis.</p>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadImage.mutate({ croquisId: croquis.id, file });
            }}
          />
          {uploadImage.isPending && <p className="text-muted">Subiendo…</p>}
        </div>
      </div>
    );
  }

  const escalaOk = hasScale(croquis);
  const selected = localPoligonos.find((p) => p.id === selectedId) ?? null;
  const cultivosEnUso = Array.from(
    new Set(
      localPoligonos
        .flatMap((p) => p.cuadro?.campanas?.filter((c) => c.estado === "ACTIVA").map((c) => c.cultivo?.nombre) ?? [])
        .filter((n): n is string => !!n)
    )
  );
  const enfermedadesVisibles = capaEnfermedades
    ? filtrarPorCapa(croquis.enfermedadesMarcadas ?? [], filtroEnfermedad)
    : [];
  const malezasVisibles = capaMalezas ? filtrarPorCapa(croquis.malezasMarcadas ?? [], filtroMaleza) : [];
  const areaSeleccionada = selected ? polygonAreaM2(selected.puntos, croquis) : null;
  const historialSeleccionado = (selected?.cuadro?.campanas ?? []).slice().sort((a, b) => {
    const fa = a.fechaPlantacion ? new Date(a.fechaPlantacion).getTime() : 0;
    const fb = b.fechaPlantacion ? new Date(b.fechaPlantacion).getTime() : 0;
    return fb - fa;
  });

  function resetTools() {
    setTool(null);
    setDraft([]);
    setPendingRect(null);
  }

  function handleAddDraftPoint(pt: Point) {
    if (tool === "rectangulo" && pendingRect) {
      const points = buildRectanglePoints(pt, pendingRect, croquis!);
      if (!points) return;
      setDraft(points);
      setTool(null);
      setPendingRect(null);
      setAssignModal("new");
      return;
    }
    if (tool === "calibrar") {
      setDraft((d) => {
        const next = [...d, pt];
        if (next.length === 2) setCalibrateModal({ puntoA: next[0], puntoB: next[1] });
        return next;
      });
      return;
    }
    if (tool === "enfermedad" || tool === "maleza") {
      const tipo: TipoRegistroCroquis = tool;
      setDraft((d) => {
        const next = [...d, pt];
        if (next.length === 2) setRegistroModal({ tipo, centro: next[0], borde: next[1] });
        return next;
      });
      return;
    }
    setDraft((d) => [...d, pt]);
  }

  function handleFinishDrawing() {
    if (draft.length < 3) return;
    setAssignModal("new");
  }

  function handleVertexDrag(poligonoId: number, index: number, pt: Point) {
    draggingRef.current = true;
    setLocalPoligonos((prev) =>
      prev.map((p) =>
        p.id === poligonoId
          ? { ...p, puntos: p.puntos.map((old, i) => (i === index ? pt : old)) }
          : p
      )
    );
  }

  function handleVertexDragEnd(poligonoId: number) {
    draggingRef.current = false;
    const pol = localPoligonos.find((p) => p.id === poligonoId);
    if (pol) updatePoligono.mutate({ id: poligonoId, data: { puntos: pol.puntos } });
  }

  function handleVertexDelete(poligonoId: number, index: number) {
    const pol = localPoligonos.find((p) => p.id === poligonoId);
    if (!pol || pol.puntos.length <= 3) return;
    const puntos = pol.puntos.filter((_, i) => i !== index);
    setLocalPoligonos((prev) => prev.map((p) => (p.id === poligonoId ? { ...p, puntos } : p)));
    updatePoligono.mutate({ id: poligonoId, data: { puntos } });
  }

  function handleEdgeInsert(poligonoId: number, index: number, pt: Point) {
    const pol = localPoligonos.find((p) => p.id === poligonoId);
    if (!pol) return;
    const puntos = [...pol.puntos.slice(0, index + 1), pt, ...pol.puntos.slice(index + 1)];
    setLocalPoligonos((prev) => prev.map((p) => (p.id === poligonoId ? { ...p, puntos } : p)));
    updatePoligono.mutate({ id: poligonoId, data: { puntos } });
  }

  function handleConfirmarRegistro(result: MarcarRegistroResult) {
    if (!registroModal || !croquis) return;
    const centro = registroModal.centro;
    const radioMetros = distanceMeters(registroModal.centro, registroModal.borde, croquis) ?? 0;
    const ubicacion = { croquisId: croquis.id, croquisX: centro.x, croquisY: centro.y, radioMetros };
    const crear = registroModal.tipo === "enfermedad" ? createEnfermedad : createMaleza;
    const actualizar = registroModal.tipo === "enfermedad" ? updateEnfermedad : updateMaleza;
    if (result.mode === "nueva") {
      crear.mutate({ campanaId: result.campanaId, data: { ...result.data, ...ubicacion } });
    } else {
      actualizar.mutate({ id: result.registroId, data: ubicacion });
    }
    setRegistroModal(null);
    resetTools();
  }

  return (
    <div>
      <PageHeader finca={finca} />

      <div className="card" style={{ padding: "0.6rem" }}>
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: "0.6rem",
          }}
        >
          <button
            className="btn small"
            onClick={() => {
              setMode(mode === "ver" ? "editar" : "ver");
              setSelectedId(null);
              resetTools();
            }}
          >
            {mode === "ver" ? "✏️ Editar" : "👁️ Ver"}
          </button>

          {mode === "editar" && !tool && (
            <>
              <button
                className="btn secondary small"
                onClick={() => {
                  setTool("cuadro");
                  setSelectedId(null);
                  setDraft([]);
                }}
              >
                + Nuevo cuadro
              </button>
              <button
                className="btn secondary small"
                disabled={!escalaOk}
                title={escalaOk ? undefined : "Calibrá la escala primero"}
                onClick={() => setRectModalOpen(true)}
              >
                + Rectángulo por medidas
              </button>
              <button
                className="btn secondary small"
                onClick={() => {
                  setTool("calibrar");
                  setSelectedId(null);
                  setDraft([]);
                }}
              >
                📏 {escalaOk ? "Recalibrar escala" : "Calibrar escala"}
              </button>
              <button
                className="btn secondary small"
                disabled={!escalaOk}
                title={escalaOk ? undefined : "Calibrá la escala primero"}
                onClick={() => {
                  setTool("enfermedad");
                  setSelectedId(null);
                  setDraft([]);
                }}
              >
                🦠 Marcar enfermedad
              </button>
              <button
                className="btn secondary small"
                disabled={!escalaOk}
                title={escalaOk ? undefined : "Calibrá la escala primero"}
                onClick={() => {
                  setTool("maleza");
                  setSelectedId(null);
                  setDraft([]);
                }}
              >
                🌿 Marcar maleza
              </button>
            </>
          )}

          {tool === "cuadro" && (
            <>
              <span className="text-muted" style={{ fontSize: "0.8rem" }}>
                Tocá el croquis para agregar puntos ({draft.length})
              </span>
              <button className="btn small" disabled={draft.length < 3} onClick={handleFinishDrawing}>
                Finalizar
              </button>
              <button className="btn secondary small" onClick={resetTools}>
                Cancelar
              </button>
            </>
          )}

          {tool === "calibrar" && (
            <>
              <span className="text-muted" style={{ fontSize: "0.8rem" }}>
                Tocá 2 puntos sobre una medida conocida del plano ({draft.length}/2)
              </span>
              <button className="btn secondary small" onClick={resetTools}>
                Cancelar
              </button>
            </>
          )}

          {(tool === "enfermedad" || tool === "maleza") && (
            <>
              <span className="text-muted" style={{ fontSize: "0.8rem" }}>
                Tocá el centro y después el borde del área afectada ({draft.length}/2)
              </span>
              <button className="btn secondary small" onClick={resetTools}>
                Cancelar
              </button>
            </>
          )}

          {tool === "rectangulo" && (
            <>
              <span className="text-muted" style={{ fontSize: "0.8rem" }}>
                Tocá el punto donde anclar la esquina del rectángulo
              </span>
              <button className="btn secondary small" onClick={resetTools}>
                Cancelar
              </button>
            </>
          )}

          {mode === "editar" && !tool && selected && (
            <>
              <span className="tag">{selected.cuadro?.nombre ?? "Sin asignar"}</span>
              <button className="btn secondary small" onClick={() => setAssignModal("reassign")}>
                Reasignar
              </button>
              <button
                className="btn danger small"
                onClick={() => {
                  if (confirm("¿Eliminar esta forma del croquis?")) {
                    deletePoligono.mutate(selected.id, { onSuccess: () => setSelectedId(null) });
                  }
                }}
              >
                Eliminar
              </button>
            </>
          )}

          <label className="btn secondary small" style={{ marginLeft: "auto", cursor: "pointer" }}>
            Cambiar imagen
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadImage.mutate({ croquisId: croquis.id, file });
              }}
            />
          </label>
        </div>

        <CroquisStage
          imageUrl={resolveImageUrl(croquis.imagenPath)}
          imgWidth={croquis.imagenAncho ?? 1000}
          imgHeight={croquis.imagenAlto ?? 700}
          poligonos={localPoligonos}
          enfermedades={enfermedadesVisibles}
          malezas={malezasVisibles}
          escalaMetrosPorPixel={croquis.escalaMetrosPorPixel}
          escalaPuntoA={croquis.escalaPuntoA}
          escalaPuntoB={croquis.escalaPuntoB}
          mode={mode}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onNavigateCuadro={(cuadroId) => navigate(`/cuadros/${cuadroId}`)}
          onSelectEnfermedad={(enf) => {
            if (enf.campana?.cuadroId) navigate(`/cuadros/${enf.campana.cuadroId}/campanas/${enf.campanaId}`);
          }}
          onSelectMaleza={(mal) => {
            if (mal.campana?.cuadroId) navigate(`/cuadros/${mal.campana.cuadroId}/campanas/${mal.campanaId}`);
          }}
          tool={tool}
          draft={draft}
          onAddDraftPoint={handleAddDraftPoint}
          onVertexDrag={handleVertexDrag}
          onVertexDragEnd={handleVertexDragEnd}
          onVertexDelete={handleVertexDelete}
          onEdgeInsert={handleEdgeInsert}
        />

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", marginTop: "0.6rem", alignItems: "center" }}>
          {escalaOk ? (
            <span className="text-muted" style={{ fontSize: "0.75rem" }}>
              📏 Escala calibrada ({croquis.escalaDistanciaM} m de referencia)
            </span>
          ) : (
            <span className="text-muted" style={{ fontSize: "0.75rem" }}>
              Sin escala calibrada — las medidas reales no van a estar disponibles hasta calibrar.
            </span>
          )}

          {(croquis.enfermedadesMarcadas?.length ?? 0) > 0 && (
            <label style={{ fontSize: "0.75rem", display: "flex", gap: "0.4rem", alignItems: "center" }}>
              <input
                type="checkbox"
                checked={capaEnfermedades}
                onChange={(e) => setCapaEnfermedades(e.target.checked)}
              />
              🦠 Enfermedades
              {capaEnfermedades && (
                <select
                  value={filtroEnfermedad}
                  onChange={(e) => setFiltroEnfermedad(e.target.value as FiltroCapa)}
                  style={{ fontSize: "0.75rem" }}
                >
                  <option value="todas">Todas (historial completo)</option>
                  <option value="ultima">Última campaña por cuadro</option>
                  <option value="activa">Solo campaña activa</option>
                </select>
              )}
            </label>
          )}

          {(croquis.malezasMarcadas?.length ?? 0) > 0 && (
            <label style={{ fontSize: "0.75rem", display: "flex", gap: "0.4rem", alignItems: "center" }}>
              <input type="checkbox" checked={capaMalezas} onChange={(e) => setCapaMalezas(e.target.checked)} />
              🌿 Malezas
              {capaMalezas && (
                <select
                  value={filtroMaleza}
                  onChange={(e) => setFiltroMaleza(e.target.value as FiltroCapa)}
                  style={{ fontSize: "0.75rem" }}
                >
                  <option value="todas">Todas (historial completo)</option>
                  <option value="ultima">Última campaña por cuadro</option>
                  <option value="activa">Solo campaña activa</option>
                </select>
              )}
            </label>
          )}
        </div>

        {cultivosEnUso.length > 0 && (
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "0.6rem" }}>
            {cultivosEnUso.map((c) => (
              <span key={c} style={{ fontSize: "0.8rem" }}>
                <span className="crop-color-dot" style={{ background: colorForCultivo(c) }} />
                {c}
              </span>
            ))}
          </div>
        )}

        {((croquis.enfermedadesMarcadas?.length ?? 0) > 0 || (croquis.malezasMarcadas?.length ?? 0) > 0) && (
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "0.4rem", alignItems: "center" }}>
            {["BAJO", "MEDIO", "ALTO"].map((n) => (
              <span key={n} style={{ fontSize: "0.75rem" }}>
                <span
                  className="crop-color-dot"
                  style={{ background: colorForNivelInfestacion(n), display: "inline-block" }}
                />
                Nivel {n.toLowerCase()}
              </span>
            ))}
            <span className="text-muted" style={{ fontSize: "0.7rem" }}>
              (borde sólido = enfermedad · borde punteado = maleza)
            </span>
          </div>
        )}
      </div>

      {mode === "editar" && !tool && (
        <p className="text-muted" style={{ fontSize: "0.8rem", marginTop: "0.5rem" }}>
          Doble toque sobre un vértice para borrarlo · tocá el punto blanco en el medio de un lado
          para agregar un vértice ahí.
        </p>
      )}

      {selected && (
        <div className="card" style={{ marginTop: "0.6rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong>{selected.cuadro?.nombre ?? "Parcela sin asignar"}</strong>
              {escalaOk && (
                <span className="text-muted" style={{ fontSize: "0.85rem", marginLeft: "0.6rem" }}>
                  Superficie real: {formatArea(areaSeleccionada)}
                </span>
              )}
            </div>
            {historialSeleccionado.length > 0 && (
              <button className="btn secondary small" onClick={() => setShowHistorial((s) => !s)}>
                {showHistorial ? "Ocultar" : "Ver"} historial de cultivos ({historialSeleccionado.length})
              </button>
            )}
          </div>
          {showHistorial && historialSeleccionado.length > 0 && (
            <table className="table" style={{ marginTop: "0.5rem" }}>
              <thead>
                <tr>
                  <th>Campaña</th>
                  <th>Cultivo</th>
                  <th>Estado</th>
                  <th>Plantación</th>
                </tr>
              </thead>
              <tbody>
                {historialSeleccionado.map((c) => (
                  <tr key={c.id}>
                    <td>{c.nombre}</td>
                    <td>
                      {c.cultivo?.nombre}
                      {c.variedad?.nombre ? ` (${c.variedad.nombre})` : ""}
                    </td>
                    <td>{c.estado}</td>
                    <td>{c.fechaPlantacion ? new Date(c.fechaPlantacion).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {assignModal === "new" && (
        <AssignCuadroModal
          cuadros={cuadros ?? []}
          onClose={() => {
            setAssignModal(null);
            resetTools();
          }}
          onConfirm={(cuadroId, color) => {
            createPoligono.mutate(
              { cuadroId, color, puntos: draft } as unknown as Partial<CroquisPoligono>,
              {
                onSuccess: () => {
                  setAssignModal(null);
                  resetTools();
                },
              }
            );
          }}
        />
      )}

      {assignModal === "reassign" && selected && (
        <AssignCuadroModal
          cuadros={cuadros ?? []}
          initialCuadroId={selected.cuadroId}
          initialColor={selected.color}
          onClose={() => setAssignModal(null)}
          onConfirm={(cuadroId, color) => {
            updatePoligono.mutate(
              { id: selected.id, data: { cuadroId, color } },
              { onSuccess: () => setAssignModal(null) }
            );
          }}
        />
      )}

      {calibrateModal && (
        <CalibrateScaleModal
          onClose={() => {
            setCalibrateModal(null);
            resetTools();
          }}
          onConfirm={(distanciaM) => {
            const dx = (calibrateModal.puntoB.x - calibrateModal.puntoA.x) * (croquis.imagenAncho ?? 1000);
            const dy = (calibrateModal.puntoB.y - calibrateModal.puntoA.y) * (croquis.imagenAlto ?? 700);
            const pixelDist = Math.sqrt(dx * dx + dy * dy) || 1;
            updateCroquis.mutate({
              id: croquis.id,
              data: {
                escalaMetrosPorPixel: distanciaM / pixelDist,
                escalaPuntoA: calibrateModal.puntoA,
                escalaPuntoB: calibrateModal.puntoB,
                escalaDistanciaM: distanciaM,
              },
            });
            setCalibrateModal(null);
            resetTools();
          }}
        />
      )}

      {rectModalOpen && (
        <RectanguloPorMedidasModal
          onClose={() => setRectModalOpen(false)}
          onConfirm={(anchoM, altoM) => {
            setPendingRect({ anchoM, altoM });
            setTool("rectangulo");
            setRectModalOpen(false);
          }}
        />
      )}

      {registroModal && (
        <MarcarRegistroModal
          tipo={registroModal.tipo}
          cuadros={cuadros ?? []}
          cuadroIdPreseleccionado={
            localPoligonos.find((p) => pointInPolygon(registroModal.centro, p.puntos))?.cuadroId
          }
          onClose={() => {
            setRegistroModal(null);
            resetTools();
          }}
          onConfirm={handleConfirmarRegistro}
        />
      )}
    </div>
  );
}

function PageHeader({ finca }: { finca?: Finca }) {
  return (
    <div className="page-header">
      <div>
        {finca && (
          <Link to={`/finca/${finca.id}`} className="text-muted" style={{ fontSize: "0.85rem" }}>
            ← {finca.nombre}
          </Link>
        )}
        <h1>Croquis</h1>
      </div>
    </div>
  );
}
