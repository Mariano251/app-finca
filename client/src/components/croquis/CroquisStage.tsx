import { useEffect, useRef, useState } from "react";
import { Circle, Group, Image as KonvaImage, Layer, Line, Stage, Text } from "react-konva";
import useImage from "use-image";
import type Konva from "konva";
import type { CroquisPoligono, Enfermedad, Maleza } from "../../api/types";
import { colorForNivelInfestacion } from "../../constants";
import { distanceMeters, formatArea, formatDistance, metersPerNormalizedUnit, polygonAreaM2 } from "./geometry";

export interface Point {
  x: number;
  y: number;
}

export type CroquisTool = "cuadro" | "calibrar" | "enfermedad" | "maleza" | "rectangulo" | null;

interface Props {
  imageUrl: string;
  imgWidth: number;
  imgHeight: number;
  poligonos: CroquisPoligono[];
  enfermedades: Enfermedad[];
  malezas: Maleza[];
  escalaMetrosPorPixel?: number | null;
  escalaPuntoA?: Point | null;
  escalaPuntoB?: Point | null;
  mode: "ver" | "editar";
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  onNavigateCuadro: (cuadroId: number) => void;
  onSelectEnfermedad: (enfermedad: Enfermedad) => void;
  onSelectMaleza: (maleza: Maleza) => void;
  tool: CroquisTool;
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
  enfermedades,
  malezas,
  escalaMetrosPorPixel,
  escalaPuntoA,
  escalaPuntoB,
  mode,
  selectedId,
  onSelect,
  onNavigateCuadro,
  onSelectEnfermedad,
  onSelectMaleza,
  tool,
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
  const croquisForScale = { escalaMetrosPorPixel, imagenAncho: imgWidth, imagenAlto: imgHeight };

  function handleStageClick(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    if (mode !== "editar" || !tool) return;
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

          {/* Linea de calibracion de escala, tenue cuando no se esta recalibrando */}
          {escalaPuntoA && escalaPuntoB && tool !== "calibrar" && (
            <>
              <Line
                points={flatten([escalaPuntoA, escalaPuntoB], stageW, stageH)}
                stroke="#555"
                strokeWidth={1}
                dash={[4, 4]}
                opacity={0.5}
              />
              <Circle x={escalaPuntoA.x * stageW} y={escalaPuntoA.y * stageH} radius={3} fill="#555" opacity={0.6} />
              <Circle x={escalaPuntoB.x * stageW} y={escalaPuntoB.y * stageH} radius={3} fill="#555" opacity={0.6} />
            </>
          )}

          {/* Circulos de enfermedades marcadas: borde solido */}
          {enfermedades.map((enf) => {
            if (enf.croquisX == null || enf.croquisY == null || !enf.radioMetros) return null;
            const m = metersPerNormalizedUnit(croquisForScale);
            const radiusPx = m ? (enf.radioMetros / m.x) * stageW : 0;
            if (!radiusPx) return null;
            return (
              <MarcadorCirculo
                key={`enf-${enf.id}`}
                x={enf.croquisX * stageW}
                y={enf.croquisY * stageH}
                radius={radiusPx}
                color={colorForNivelInfestacion(enf.nivelIncidencia)}
                dashed={false}
                label={enf.nombre}
                onClick={() => onSelectEnfermedad(enf)}
              />
            );
          })}

          {/* Circulos de malezas marcadas: borde punteado, para distinguirlas de enfermedades */}
          {malezas.map((mal) => {
            if (mal.croquisX == null || mal.croquisY == null || !mal.radioMetros) return null;
            const m = metersPerNormalizedUnit(croquisForScale);
            const radiusPx = m ? (mal.radioMetros / m.x) * stageW : 0;
            if (!radiusPx) return null;
            return (
              <MarcadorCirculo
                key={`mal-${mal.id}`}
                x={mal.croquisX * stageW}
                y={mal.croquisY * stageH}
                radius={radiusPx}
                color={colorForNivelInfestacion(mal.nivelInfestacion)}
                dashed
                label={mal.especie}
                onClick={() => onSelectMaleza(mal)}
              />
            );
          })}

          {tool === "cuadro" && draft.length > 0 && (
            <>
              <Line
                points={flatten(draft, stageW, stageH)}
                stroke="#2c5a2c"
                strokeWidth={2}
                dash={[6, 4]}
                closed={draft.length >= 3}
              />
              {draft.map((p, i) => (
                <Circle key={i} x={p.x * stageW} y={p.y * stageH} radius={6} fill="#2c5a2c" />
              ))}
              {escalaMetrosPorPixel &&
                draft.map((p, i) => {
                  if (i === 0) return null;
                  const prev = draft[i - 1];
                  const d = distanceMeters(prev, p, croquisForScale);
                  const mid = { x: (prev.x + p.x) / 2, y: (prev.y + p.y) / 2 };
                  return (
                    <Text
                      key={`len-${i}`}
                      x={mid.x * stageW}
                      y={mid.y * stageH}
                      text={formatDistance(d)}
                      fontSize={12}
                      fill="#1f3d1f"
                      padding={2}
                    />
                  );
                })}
              {escalaMetrosPorPixel && draft.length >= 3 && (
                <Text
                  x={(draft.reduce((s, p) => s + p.x, 0) / draft.length) * stageW}
                  y={(draft.reduce((s, p) => s + p.y, 0) / draft.length) * stageH}
                  text={formatArea(polygonAreaM2(draft, croquisForScale))}
                  fontSize={13}
                  fontStyle="bold"
                  fill="#1f3d1f"
                  padding={2}
                />
              )}
            </>
          )}

          {tool === "calibrar" && draft.length > 0 && (
            <>
              {draft.length === 2 && (
                <Line points={flatten(draft, stageW, stageH)} stroke="#c2703d" strokeWidth={2} />
              )}
              {draft.map((p, i) => (
                <Circle key={i} x={p.x * stageW} y={p.y * stageH} radius={6} fill="#c2703d" />
              ))}
            </>
          )}

          {(tool === "enfermedad" || tool === "maleza") && draft.length > 0 && (
            <>
              <Circle x={draft[0].x * stageW} y={draft[0].y * stageH} radius={5} fill="#8a5fc2" />
              {draft.length === 2 && (
                <Circle
                  x={draft[0].x * stageW}
                  y={draft[0].y * stageH}
                  radius={Math.hypot((draft[1].x - draft[0].x) * stageW, (draft[1].y - draft[0].y) * stageH)}
                  stroke="#8a5fc2"
                  strokeWidth={2}
                  dash={[5, 4]}
                />
              )}
            </>
          )}
        </Layer>
      </Stage>
    </div>
  );
}

/** Circulo de un registro geolocalizado (enfermedad/maleza). El borde punteado distingue las
 *  malezas de las enfermedades (mismo criterio de color por nivel de infestacion para ambas). */
function MarcadorCirculo({
  x,
  y,
  radius,
  color,
  dashed,
  label,
  onClick,
}: {
  x: number;
  y: number;
  radius: number;
  color: string;
  dashed: boolean;
  label?: string | null;
  onClick: () => void;
}) {
  const side = radius * Math.SQRT2;
  const fontSize = Math.max(9, Math.min(14, radius / 2.5));
  return (
    <Group onClick={onClick} onTap={onClick}>
      <Circle
        x={x}
        y={y}
        radius={radius}
        fill={color + "40"}
        stroke={color}
        strokeWidth={2}
        dash={dashed ? [6, 4] : undefined}
      />
      {label && (
        <Text
          x={x - side / 2}
          y={y - side / 2}
          width={side}
          height={side}
          text={label}
          align="center"
          verticalAlign="middle"
          fontSize={fontSize}
          fontStyle="bold"
          fill="#1f2a1f"
          wrap="word"
          ellipsis
          listening={false}
        />
      )}
    </Group>
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
