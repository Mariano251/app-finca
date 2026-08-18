import type { Insumo } from "../api/types";
import { CATEGORIA_INSUMO_OPTIONS } from "../constants";
import { normalizar, matchPorNombre } from "./normalizar";

/**
 * Parser de "carga rápida" para Stock: registra una entrada/salida de un insumo ya cargado, o —
 * si el texto arranca con "insumo"/"nuevo insumo" — da de alta un insumo nuevo. Mismas reglas que
 * el parser de la Biblioteca (parseTexto.ts): sin red, sin IA, y nunca resuelve solo una
 * ambigüedad — ver QuickAdd.tsx para la pantalla de confirmación.
 */

export interface DraftMovimiento {
  textoOriginal: string;
  tipo: "ENTRADA" | "SALIDA";
  cantidad: number | null;
  unidadMencionada: string | null;
  nombreMencionado: string | null;
  matches: Insumo[]; // 0 = no encontrado en el catálogo local, 1 = match seguro, 2+ = ambiguo
  motivo: string | null;
}

export interface DraftInsumoNuevo {
  textoOriginal: string;
  nombre: string | null;
  categoria: string | null;
  unidad: string | null;
  stockMinimo: number | null;
}

export type DraftStock =
  | { modo: "movimiento"; draft: DraftMovimiento }
  | { modo: "insumo_nuevo"; draft: DraftInsumoNuevo };

const PALABRAS_SALIDA = ["salida", "consumi", "consumo", "gaste", "use", "usamos", "saque", "retire"];

function detectarTipoMovimiento(texto: string): "ENTRADA" | "SALIDA" {
  const n = normalizar(texto);
  if (PALABRAS_SALIDA.some((p) => n.includes(p))) return "SALIDA";
  return "ENTRADA"; // "cargar stock" sin más contexto casi siempre es sumar, no restar
}

/** Busca "<número> <palabra>" (ej. "200 litros", "10 bolsas") — la palabra que sigue al número se
 *  guarda como unidad mencionada, solo informativa (no se inventa una si no aparece). */
function extraerCantidadYUnidad(texto: string): { cantidad: number | null; unidad: string | null; resto: string } {
  const regex = /(\d+(?:[.,]\d+)?)\s*([a-zA-Záéíóúñ]+)?/;
  const m = texto.match(regex);
  if (!m) return { cantidad: null, unidad: null, resto: texto };
  const cantidad = Number(m[1].replace(",", "."));
  const unidad = m[2] ?? null;
  const resto = texto.slice(0, m.index) + texto.slice((m.index ?? 0) + m[0].length);
  return { cantidad, unidad, resto };
}

function extraerMotivo(texto: string): string | null {
  const m = texto.match(/(?:motivo|porque|por)\s*:?\s*(.+)$/i);
  return m ? m[1].trim() || null : null;
}

/** Saca del texto los verbos/conectores de relleno para quedarse con lo que probablemente sea el
 *  nombre del insumo mencionado (lo que después se matchea contra el catálogo local). */
function limpiarNombreMencionado(texto: string): string | null {
  const limpio = texto
    .replace(/\b(entrada|salida|de|del|la|el|los|las|para|con|a|al)\b/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  return limpio.length >= 2 ? limpio : null;
}

function parseMovimiento(texto: string, catalogo: Insumo[]): DraftMovimiento {
  const sinVerbo = texto.trim().replace(/^(agregar|agrega|cargar|carga|registrar|registra)\s+/i, "");
  const motivo = extraerMotivo(sinVerbo);
  const sinMotivo = motivo ? sinVerbo.replace(/(?:motivo|porque|por)\s*:?\s*.+$/i, "") : sinVerbo;
  const { cantidad, unidad, resto } = extraerCantidadYUnidad(sinMotivo);
  const nombreMencionado = limpiarNombreMencionado(resto);

  return {
    textoOriginal: texto,
    tipo: detectarTipoMovimiento(texto),
    cantidad,
    unidadMencionada: unidad,
    nombreMencionado,
    matches: nombreMencionado ? matchPorNombre(nombreMencionado, catalogo) : [],
    motivo,
  };
}

function detectarCategoria(texto: string): string | null {
  const n = normalizar(texto);
  const c = CATEGORIA_INSUMO_OPTIONS.find((o) => o.value !== "OTRO" && n.includes(normalizar(o.label)));
  return c?.value ?? null;
}

function parseInsumoNuevo(texto: string): DraftInsumoNuevo {
  const sinVerbo = texto.trim().replace(/^(agregar|agrega|cargar|carga|nuevo|crear|alta de?)\s+insumo\s*/i, "");
  const primeraComa = sinVerbo.indexOf(",");
  const nombre = (primeraComa >= 0 ? sinVerbo.slice(0, primeraComa) : sinVerbo).trim() || null;
  const unidadMatch = sinVerbo.match(/unidad\s+([a-zA-Záéíóúñ]+)/i);
  const minimoMatch = sinVerbo.match(/m[ií]nimo\s+(\d+(?:[.,]\d+)?)/i);

  return {
    textoOriginal: texto,
    nombre: nombre && nombre.length <= 60 ? nombre : null,
    categoria: detectarCategoria(sinVerbo),
    unidad: unidadMatch ? unidadMatch[1] : null,
    stockMinimo: minimoMatch ? Number(minimoMatch[1].replace(",", ".")) : null,
  };
}

export function parseTextoStock(texto: string, catalogo: Insumo[]): DraftStock {
  const n = normalizar(texto);
  if (/\binsumo\b/.test(n) && /\b(nuevo|agregar|crear|alta)\b/.test(n)) {
    return { modo: "insumo_nuevo", draft: parseInsumoNuevo(texto) };
  }
  return { modo: "movimiento", draft: parseMovimiento(texto, catalogo) };
}
