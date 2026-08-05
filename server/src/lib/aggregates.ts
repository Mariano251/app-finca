/** Shared helpers for turning a campana's cosecha rows into a single yield summary. */
export function resumenCosechas(cosechas: { produccionTotal: number | null; superficieCosechada: number | null; rendimientoPorHa: number | null }[]) {
  const produccionTotal = cosechas.reduce((s, c) => s + (c.produccionTotal ?? 0), 0);
  const superficieCosechada = cosechas.reduce((s, c) => s + (c.superficieCosechada ?? 0), 0);
  const rendimientoPorHa =
    superficieCosechada > 0
      ? produccionTotal / superficieCosechada
      : cosechas.length > 0
        ? cosechas.reduce((s, c) => s + (c.rendimientoPorHa ?? 0), 0) / cosechas.length
        : null;
  return { produccionTotal, superficieCosechada, rendimientoPorHa };
}

export function anioDe(fecha: Date | null | undefined): number | null {
  return fecha ? new Date(fecha).getFullYear() : null;
}
