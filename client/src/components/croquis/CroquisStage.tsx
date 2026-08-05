import { useEffect, useRef, useState } from "react";
import { Circle, Image as KonvaImage, Layer, Line, Stage } from "react-konva";
import useImage from "use-image";
import type Konva from "konva";
import type { CroquisPoligono } from "../../api/types";

export interface Point {
  x: number;
  y: number;
}

interface Props {
  imageUrl: string;
  imgWidth: number;
  imgHeight: number;
  poligonos: CroquisPoligono[];
  mode: "ver" | "editar";
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  onNavigateCuadro: (cuadroId: number) => void;
  drawing: boolean;
  draft: Point[];
  onAddDraftPoint: (pt: Point) => void;
  onVertexDrag: (poligonoId: number, index: number, pt: Point) => void;
  onVertexDragEnd: (poligonoId: number) => void;
  onVertexDelete: (poligonoId: number, index: number) => void;
  onEdgeInsert: (poligonoId: number, index: number, pt: Point) => void;
}

function flatten(points: Point[], w: number, h: number) {
  return points.flatMap((p) => [p.x * w, p.y * h]);
}

export function CroquisStage({
  imageUrl,
  imgWidth,
  imgHeight,
  poligonos,
  mode,
  selectedId,
  onSelect,
  onNavigateCuadro,
  drawing,
  draft,
  onAddDraftPoint,
  onVertexDrag,
  onVertexDragEnd,
  onVertexDelete,
  onEdgeInsert,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageW, setStageW] = useState(600);
  const [image] = useImage(imageUrl);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setStageW(Math.max(240, Math.floor(w)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const aspect = imgHeight && imgWidth ? imgHeight / imgWidth : 0.66;
  const stageH = Math.round(stageW * aspect);

  function handleStageClick(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    if (mode !== "editar" || !drawing) return;
    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos) return;
    onAddDraftPoint({ x: pos.x / stageW, y: pos.y / stageH });
  }

  return (
    <div ref={containerRef} style={{ width: "100%", touchAction: "none" }}>
      <Stage
        width={stageW}
        height={stageH || 1}
        onClick={handleStageClick}
        onTap={handleStageClick}
        style={{ background: "#e9ece3", borderRadius: 8, overflow: "hidden" }}
      >
        <Layer>
          {image && <KonvaImage image={image} width={stageW} height={stageH} />}

          {poligonos.map((pol) => {
            const isSelected = pol.id === selectedId;
            const pts = flatten(pol.puntos, stageW, stageH);
            return (
              <Line
                key={pol.id}
                points={pts}
                closed
                fill={pol.color + "66"}
                stroke={pol.color}
                strokeWidth={isSelected ? 3 : 1.5}
                onClick={() => {
                  if (mode === "editar") onSelect(pol.id);
                  else if (pol.cuadroId) onNavigateCuadro(pol.cuadroId);
                }}
                onTap={() => {
                  if (mode === "editar") onSelect(pol.id);
                  else if (pol.cuadroId) onNavigateCuadro(pol.cuadroId);
                }}
              />
            );
          })}

          {mode === "editar" &&
            poligonos
              .filter((p) => p.id === selectedId)
              .map((pol) => (
                <PoligonoHandles
                  key={pol.id}
                  poligono={pol}
                  stageW={stageW}
                  stageH={stageH}
                  onVertexDrag={onVertexDrag}
                  onVertexDragEnd={onVertexDragEnd}
                  onVertexDelete={onVertexDelete}
                  onEdgeInsert={onEdgeInsert}
                />
              ))}

          {drawing && draft.length > 0 && (
            <>
              <Line
                points={flatten(draft, stageW, stageH)}
                stroke="#2c5a2c"
                strokeWidth={2}
                dash={[6, 4]}
              />
              {draft.map((p, i) => (
                <Circle key={i} x={p.x * stageW} y={p.y * stageH} radius={6} fill="#2c5a2c" />
              ))}
            </>
          )}
        </Layer>
      </Stage>
    </div>
  );
}

function PoligonoHandles({
  poligono,
  stageW,
  stageH,
  onVertexDrag,
  onVertexDragEnd,
  onVertexDelete,
  onEdgeInsert,
}: {
  poligono: CroquisPoligono;
  stageW: number;
  stageH: number;
  onVertexDrag: (poligonoId: number, index: number, pt: Point) => void;
  onVertexDragEnd: (poligonoId: number) => void;
  onVertexDelete: (poligonoId: number, index: number) => void;
  onEdgeInsert: (poligonoId: number, index: number, pt: Point) => void;
}) {
  const pts = poligono.puntos;
  return (
    <>
      {pts.map((p, i) => {
        const next = pts[(i + 1) % pts.length];
        const mid = { x: (p.x + next.x) / 2, y: (p.y + next.y) / 2 };
        return (
          <Circle
            key={`mid-${i}`}
            x={mid.x * stageW}
            y={mid.y * stageH}
            radius={5}
            fill="#ffffff"
            stroke="#2c5a2c"
            strokeWidth={1}
            opacity={0.85}
            onClick={() => onEdgeInsert(poligono.id, i, mid)}
            onTap={() => onEdgeInsert(poligono.id, i, mid)}
          />
        );
      })}
      {pts.map((p, i) => (
        <Circle
          key={`v-${i}`}
          x={p.x * stageW}
          y={p.y * stageH}
          radius={8}
          fill="#ffffff"
          stroke="#2c5a2c"
          strokeWidth={2}
          draggable
          onDragMove={(e) =>
            onVertexDrag(poligono.id, i, { x: e.target.x() / stageW, y: e.target.y() / stageH })
          }
          onDragEnd={() => onVertexDragEnd(poligono.id)}
          onDblClick={() => onVertexDelete(poligono.id, i)}
          onDblTap={() => onVertexDelete(poligono.id, i)}
        />
      ))}
    </>
  );
}
