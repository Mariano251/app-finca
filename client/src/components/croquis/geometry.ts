import type { Croquis } from "../../api/types";
import type { Point } from "./CroquisStage";

/** Metros reales que representa una unidad de la coordenada normalizada 0-1, por eje. Depende
 *  del tamaño en px de la imagen porque la escala se calibró en metros/pixel. */
export function metersPerNormalizedUnit(croquis: Pick<Croquis, "escalaMetrosPorPixel" | "imagenAncho" | "imagenAlto">) {
  if (!croquis.escalaMetrosPorPixel || !croquis.imagenAncho || !croquis.imagenAlto) return null;
  return {
    x: croquis.escalaMetrosPorPixel * croquis.imagenAncho,
    y: croquis.escalaMetrosPorPixel * croquis.imagenAlto,
  };
}

export function hasScale(croquis: Pick<Croquis, "escalaMetrosPorPixel" | "imagenAncho" | "imagenAlto">) {
  return metersPerNormalizedUnit(croquis) !== null;
}

export function distanceMeters(
  p1: Point,
  p2: Point,
  croquis: Pick<Croquis, "escalaMetrosPorPixel" | "imagenAncho" | "imagenAlto">
): number | null {
  const m = metersPerNormalizedUnit(croquis);
  if (!m) return null;
  const dx = (p2.x - p1.x) * m.x;
  const dy = (p2.y - p1.y) * m.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Area real en m2 de un poligono cuyos puntos estan en coordenadas normalizadas 0-1 (formula
 *  del shoelace sobre las coordenadas ya convertidas a metros). */
export function polygonAreaM2(
  points: Point[],
  croquis: Pick<Croquis, "escalaMetrosPorPixel" | "imagenAncho" | "imagenAlto">
): number | null {
  const m = metersPerNormalizedUnit(croquis);
  if (!m || points.length < 3) return null;
  const pts = points.map((p) => ({ x: p.x * m.x, y: p.y * m.y }));
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    area += a.x * b.y - b.x * a.y;
  }
  return Math.abs(area) / 2;
}

export function formatArea(m2: number | null): string {
  if (m2 == null) return "—";
  if (m2 >= 10000) return `${(m2 / 10000).toFixed(2)} ha`;
  return `${m2.toFixed(1)} m²`;
}

export function formatDistance(m: number | null): string {
  if (m == null) return "—";
  return `${m.toFixed(1)} m`;
}

/** Genera los 4 puntos normalizados de un rectangulo axis-aligned de anchoM x altoM metros
 *  reales, anclado (esquina superior izquierda) en `anchor`. */
export function buildRectanglePoints(
  anchor: Point,
  dims: { anchoM: number; altoM: number },
  croquis: Pick<Croquis, "escalaMetrosPorPixel" | "imagenAncho" | "imagenAlto">
): Point[] | null {
  const m = metersPerNormalizedUnit(croquis);
  if (!m) return null;
  const w = dims.anchoM / m.x;
  const h = dims.altoM / m.y;
  return [
    anchor,
    { x: anchor.x + w, y: anchor.y },
    { x: anchor.x + w, y: anchor.y + h },
    { x: anchor.x, y: anchor.y + h },
  ];
}

/** Ray casting: true si el punto (coords normalizadas 0-1) cae dentro del poligono. */
export function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersects = yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}
