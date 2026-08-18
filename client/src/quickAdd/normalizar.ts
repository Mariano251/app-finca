/**
 * Helpers de texto compartidos por los parsers de carga rápida (Biblioteca y Stock — ver
 * parseTexto.ts / parseStock.ts): sin acentos, minúsculas, y un stem bien simple para tolerar
 * singular/plural en español ("pulgón"/"pulgones", "bolsa"/"bolsas").
 */

export function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function stem(palabra: string): string {
  if (palabra.endsWith("es") && palabra.length > 4) return palabra.slice(0, -2);
  if (palabra.endsWith("s") && palabra.length > 3) return palabra.slice(0, -1);
  return palabra;
}

/** Normaliza una frase completa a "tokens con stem separados por un espacio", para poder buscarla
 *  como sub-frase dentro de otro texto igualmente normalizado (cubre nombres de más de una
 *  palabra, ej. "aceite mineral", "gusano de suelo"). */
export function normalizarFrase(texto: string): string {
  return normalizar(texto)
    .split(/[^a-zñ0-9]+/)
    .filter(Boolean)
    .map(stem)
    .join(" ");
}

/** Matchea un nombre mencionado en texto libre contra un catálogo por nombre: exacto primero, si
 *  no hay ninguno, por substring en cualquier dirección. Devuelve 0 (no encontrado), 1 (seguro) o
 *  2+ (ambiguo, el que llama debe pedirle al usuario que desambigüe). */
export function matchPorNombre<T extends { nombre: string }>(nombre: string, catalogo: T[]): T[] {
  const n = normalizar(nombre);
  const exactos = catalogo.filter((e) => normalizar(e.nombre) === n);
  if (exactos.length > 0) return exactos;
  return catalogo.filter((e) => {
    const en = normalizar(e.nombre);
    return en.includes(n) || n.includes(en);
  });
}

/** Todas las entradas del catálogo cuyo nombre aparece como sub-frase dentro del texto — para
 *  catálogos cortos y cerrados donde no hace falta desambiguar (ej. cultivos, organismos). */
export function matchEntidades<T extends { nombre: string }>(texto: string, catalogo: T[]): T[] {
  const textoNorm = ` ${normalizarFrase(texto)} `;
  return catalogo.filter((e) => textoNorm.includes(` ${normalizarFrase(e.nombre)} `));
}
