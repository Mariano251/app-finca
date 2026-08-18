import type { PrincipioActivo } from "../api/types";
import { normalizar } from "./normalizar";

/**
 * Comandos rápidos (punto 23 del pedido): interpretación local, sin red — el usuario los escribe
 * en la misma caja de texto de la carga rápida (ver QuickAdd.tsx), empezando con "/".
 */
export type ResultadoComando =
  | { tipo: "navegar"; to: string }
  | { tipo: "error"; mensaje: string };

/** Devuelve `null` si el texto no es un comando (no empieza con "/") — en ese caso quien llama
 *  debe mandarlo al parser de texto libre en vez de acá. */
export function parseComando(texto: string, principiosActivos: PrincipioActivo[]): ResultadoComando | null {
  const t = texto.trim();
  if (!t.startsWith("/")) return null;

  const partes = t.slice(1).trim().split(/\s+/);
  const comando = (partes[0] ?? "").toLowerCase();
  const resto = t.slice(1).trim().replace(/^\S+\s*/, "");

  if (comando === "nuevo" && (partes[1] ?? "").toLowerCase() === "producto") {
    return { tipo: "navegar", to: "/biblioteca/productos/nuevo" };
  }
  if (comando === "nuevo" && (partes[1] ?? "").toLowerCase() === "principio") {
    return { tipo: "navegar", to: "/biblioteca/principios-activos/nuevo" };
  }
  if (comando === "nuevo" && (partes[1] ?? "").toLowerCase() === "insumo") {
    return { tipo: "navegar", to: "/stock" };
  }
  if (comando === "buscar") {
    if (!resto) return { tipo: "error", mensaje: "Usá /buscar seguido de lo que querés buscar, ej: /buscar trips" };
    return { tipo: "navegar", to: `/biblioteca/buscar?q=${encodeURIComponent(resto)}` };
  }
  if (comando === "comparar") {
    const nombres = resto.split(/\s+/).filter(Boolean);
    if (nombres.length < 2) {
      return { tipo: "error", mensaje: "Usá /comparar seguido de 2 o más nombres, ej: /comparar spirotetramat abamectina" };
    }
    const ids: number[] = [];
    for (const n of nombres) {
      const match = principiosActivos.find((p) => normalizar(p.nombre).includes(normalizar(n)) || normalizar(n).includes(normalizar(p.nombre)));
      if (!match) return { tipo: "error", mensaje: `No encontré en la biblioteca local ningún principio activo parecido a "${n}".` };
      ids.push(match.id);
    }
    return { tipo: "navegar", to: `/biblioteca/comparar?ids=${ids.join(",")}` };
  }
  if (comando === "historial") {
    const numero = partes.find((p) => /^\d+$/.test(p));
    if (!numero) return { tipo: "error", mensaje: "Usá /historial lote <número>, ej: /historial lote 12" };
    return { tipo: "navegar", to: `/cuadros/${numero}` };
  }

  return { tipo: "error", mensaje: `Comando "/${comando}" no reconocido. Probá /nuevo producto, /nuevo principio, /buscar, /comparar o /historial lote <n>.` };
}
