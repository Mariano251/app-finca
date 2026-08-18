import type { Cultivo, Organismo, PrincipioActivo } from "../api/types";
import { TIPO_FITOSANITARIO_OPTIONS, MOVILIDAD_OPTIONS } from "../constants";
import { normalizar, matchPorNombre, matchEntidades } from "./normalizar";

/**
 * Parser de "carga rápida" para la Biblioteca (punto 21 del pedido): interpreta texto libre tipo
 * "Agregar Movento, spirotetramat 15%, insecticida sistémico, trips y pulgones, ajo y cebolla"
 * sin depender de internet ni de IA — solo reglas y los catálogos ya cacheados localmente
 * (Cultivo/Organismo/PrincipioActivo), que ya funcionan offline vía el cache persistido de
 * TanStack Query. Nunca resuelve una ambigüedad solo: si hay más de un principio activo posible o
 * un cultivo/organismo no está en el catálogo local, queda marcado para que el usuario decida en
 * la pantalla de confirmación (ver QuickAdd.tsx) — la regla del pedido es "nunca guardar
 * automáticamente datos dudosos". El parser análogo para Stock está en parseStock.ts.
 */

export interface PrincipioDetectado {
  textoOriginal: string;
  concentracion: number | null;
  matches: PrincipioActivo[]; // 0 = no encontrado en el catálogo local, 1 = match seguro, 2+ = ambiguo
}

export interface DraftProducto {
  textoOriginal: string;
  nombreComercial: string | null;
  principios: PrincipioDetectado[];
  tipos: string[];
  movilidad: string | null;
  cultivos: Cultivo[];
  organismos: Organismo[];
}

function extraerNombreComercial(texto: string): string | null {
  const sinVerbo = texto.trim().replace(/^(agregar|agrega|cargar|carga|alta de?|nuevo producto)\s+/i, "");
  const primeraComa = sinVerbo.indexOf(",");
  const candidato = (primeraComa >= 0 ? sinVerbo.slice(0, primeraComa) : sinVerbo).trim();
  if (candidato.length < 2 || candidato.length > 60) return null;
  return candidato;
}

/** Busca fragmentos "<nombre> <número>%" (ej. "spirotetramat 15%"), típico de cómo se menciona un
 *  principio activo con su concentración en lenguaje natural. */
function extraerPrincipiosMencionados(texto: string): { nombre: string; concentracion: number | null }[] {
  const regex = /([A-Za-zÁÉÍÓÚÑáéíóúñ][A-Za-zÁÉÍÓÚÑáéíóúñ\s-]{1,40}?)\s+(\d+(?:[.,]\d+)?)\s*%/g;
  const resultado: { nombre: string; concentracion: number | null }[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(texto))) {
    const nombre = m[1].trim().replace(/^(y|,)+\s*/i, "");
    if (nombre.length < 3) continue;
    resultado.push({ nombre, concentracion: Number(m[2].replace(",", ".")) });
  }
  return resultado;
}

function detectarTipos(texto: string): string[] {
  const n = normalizar(texto);
  return TIPO_FITOSANITARIO_OPTIONS.filter((o) => o.value !== "OTRO" && n.includes(normalizar(o.label))).map(
    (o) => o.value
  );
}

function detectarMovilidad(texto: string): string | null {
  const n = normalizar(texto);
  const m = MOVILIDAD_OPTIONS.find((o) => o.value !== "OTRO" && n.includes(normalizar(o.label)));
  return m?.value ?? null;
}

export interface CatalogosLocales {
  cultivos: Cultivo[];
  organismos: Organismo[];
  principiosActivos: PrincipioActivo[];
}

export function parseTextoProducto(texto: string, catalogos: CatalogosLocales): DraftProducto {
  const menciones = extraerPrincipiosMencionados(texto);
  const principios: PrincipioDetectado[] = menciones.map((m) => ({
    textoOriginal: m.nombre,
    concentracion: m.concentracion,
    matches: matchPorNombre(m.nombre, catalogos.principiosActivos),
  }));

  return {
    textoOriginal: texto,
    nombreComercial: extraerNombreComercial(texto),
    principios,
    tipos: detectarTipos(texto),
    movilidad: detectarMovilidad(texto),
    cultivos: matchEntidades(texto, catalogos.cultivos),
    organismos: matchEntidades(texto, catalogos.organismos),
  };
}
