import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { useCreate, useDelete, useList, useOne, useUpdate } from "../../api/useCrud";
import type { Croquis, CroquisPoligono, Cuadro, Finca } from "../../api/types";
import { CroquisStage, type Point } from "../../components/croquis/CroquisStage";
import { AssignCuadroModal } from "../../components/croquis/AssignCuadroModal";
import { colorForCultivo, resolveImageUrl } from "../../constants";
import { isConnectivityError } from "../../offline/isConnectivityError";
import { enqueueCroquisImage } from "../../offline/queue";
import { applyOptimisticUpdate } from "../../offline/cachePatch";
import { scheduleSync } from "../../offline/sync";

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
  void updateCroquis;
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

  const [mode, setMode] = useState<"ver" | "editar">("ver");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [draft, setDraft] = useState<Point[]>([]);
  const [assignModal, setAssignModal] = useState<null | "new" | "reassign">(null);
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

  const selected = localPoligonos.find((p) => p.id === selectedId) ?? null;
  const cultivosEnUso = Array.from(
    new Set(
      localPoligonos
        .map((p) => p.cuadro?.campanas?.[0]?.cultivo?.nombre)
        .filter((n): n is string => !!n)
    )
  );

  function handleAddDraftPoint(pt: Point) {
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
              setDrawing(false);
              setDraft([]);
            }}
          >
            {mode === "ver" ? "✏️ Editar" : "👁️ Ver"}
          </button>

          {mode === "editar" && !drawing && (
            <button
              className="btn secondary small"
              onClick={() => {
                setDrawing(true);
                setSelectedId(null);
                setDraft([]);
              }}
            >
              + Nuevo cuadro
            </button>
          )}

          {drawing && (
            <>
              <span className="text-muted" style={{ fontSize: "0.8rem" }}>
                Tocá el croquis para agregar puntos ({draft.length})
              </span>
              <button className="btn small" disabled={draft.length < 3} onClick={handleFinishDrawing}>
                Finalizar
              </button>
              <button
                className="btn secondary small"
                onClick={() => {
                  setDrawing(false);
                  setDraft([]);
                }}
              >
                Cancelar
              </button>
            </>
          )}

          {mode === "editar" && !drawing && selected && (
            <>
              <span className="tag">
                {selected.cuadro?.nombre ?? "Sin asignar"}
              </span>
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
          mode={mode}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onNavigateCuadro={(cuadroId) => navigate(`/cuadros/${cuadroId}`)}
          drawing={drawing}
          draft={draft}
          onAddDraftPoint={handleAddDraftPoint}
          onVertexDrag={handleVertexDrag}
          onVertexDragEnd={handleVertexDragEnd}
          onVertexDelete={handleVertexDelete}
          onEdgeInsert={handleEdgeInsert}
        />

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
      </div>

      {mode === "editar" && (
        <p className="text-muted" style={{ fontSize: "0.8rem", marginTop: "0.5rem" }}>
          Doble toque sobre un vértice para borrarlo · tocá el punto blanco en el medio de un lado
          para agregar un vértice ahí.
        </p>
      )}

      {assignModal === "new" && (
        <AssignCuadroModal
          cuadros={cuadros ?? []}
          onClose={() => setAssignModal(null)}
          onConfirm={(cuadroId, color) => {
            createPoligono.mutate(
              { cuadroId, color, puntos: draft } as unknown as Partial<CroquisPoligono>,
              {
                onSuccess: () => {
                  setAssignModal(null);
                  setDrawing(false);
                  setDraft([]);
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
