import type { MetodoDistribucionCosto } from "@prisma/client";

export interface CampanaParaDistribucion {
  id: number;
  superficieImplantada: number;
  costoDirecto: number;
  produccion: number;
  ingreso: number;
}

const DRIVER: Partial<Record<MetodoDistribucionCosto, (c: CampanaParaDistribucion) => number>> = {
  POR_SUPERFICIE: (c) => c.superficieImplantada,
  POR_PORCENTAJE_COSTOS_DIRECTOS: (c) => c.costoDirecto,
  POR_PRODUCCION: (c) => c.produccion,
  POR_VALOR_PRODUCCION: (c) => c.ingreso,
};

/**
 * Reparte `monto` entre `campanas` segun `metodo`. Con MANUAL usa directamente las
 * asignaciones cargadas a mano (CostoIndirectoAsignacion); con los metodos proporcionales,
 * si el driver elegido da 0 para todas las campañas (ej: nadie cargó superficie todavía),
 * reparte en partes iguales en vez de dividir por cero.
 */
export function calcularAsignacion(
  campanas: CampanaParaDistribucion[],
  monto: number,
  metodo: MetodoDistribucionCosto,
  asignacionesManuales: { campanaId: number; monto: number }[] = []
): Map<number, number> {
  const resultado = new Map<number, number>();
  if (campanas.length === 0) return resultado;

  if (metodo === "MANUAL") {
    for (const a of asignacionesManuales) {
      resultado.set(a.campanaId, (resultado.get(a.campanaId) ?? 0) + a.monto);
    }
    return resultado;
  }

  const pick = DRIVER[metodo]!;
  const valores = campanas.map((c) => Math.max(0, pick(c)));
  const total = valores.reduce((s, v) => s + v, 0);

  if (total > 0) {
    campanas.forEach((c, i) => resultado.set(c.id, (valores[i] / total) * monto));
  } else {
    const partesIguales = monto / campanas.length;
    campanas.forEach((c) => resultado.set(c.id, partesIguales));
  }
  return resultado;
}
