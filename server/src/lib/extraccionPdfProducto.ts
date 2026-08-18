import pdfParse from "pdf-parse";

/**
 * Extracción "best effort" por reglas (sin IA) de los datos típicos de una etiqueta o ficha
 * técnica de un fitosanitario argentino: no hay dos PDFs con el mismo formato, así que esto NO
 * pretende ser preciso — arma un borrador para que el usuario lo revise y corrija en el
 * formulario, nunca guarda nada solo. Si el PDF es una imagen escaneada sin capa de texto,
 * `pdf-parse` devuelve muy poco o ningún texto y se lo avisamos al usuario en vez de inventar datos.
 */

const TIPOS: { tipo: string; patron: RegExp }[] = [
  { tipo: "HERBICIDA", patron: /herbicida/i },
  { tipo: "INSECTICIDA", patron: /insecticida/i },
  { tipo: "FUNGICIDA", patron: /fungicida/i },
  { tipo: "ACARICIDA", patron: /acaricida/i },
  { tipo: "NEMATICIDA", patron: /nematicida/i },
  { tipo: "BACTERICIDA", patron: /bactericida/i },
];

const FORMULACIONES = ["WDG", "SC", "EC", "CE", "WG", "WP", "SL", "CS", "GR", "SG", "OD", "ME", "EW", "FS", "DS"];

export interface PrincipioActivoExtraido {
  nombre: string;
  concentracion: number | null;
  unidad: string | null;
}

export interface ExtraccionPdfProducto {
  nombreComercial: string | null;
  /** Un producto puede tener más de una categoría (ej. "insecticida y acaricida" en la misma
   *  etiqueta) — se devuelven todas las que matcheen, no solo la primera. */
  tipos: string[];
  formulacion: string | null;
  principiosActivos: PrincipioActivoExtraido[];
  registroSenasa: string | null;
  textoInsuficiente: boolean;
  textoExtraido: string;
}

function detectarTipos(texto: string): string[] {
  return TIPOS.filter(({ patron }) => patron.test(texto)).map(({ tipo }) => tipo);
}

function detectarFormulacion(texto: string): string | null {
  for (const f of FORMULACIONES) {
    if (new RegExp(`\\b${f}\\b`).test(texto)) return f;
  }
  return null;
}

function detectarRegistroSenasa(texto: string): string | null {
  const m = texto.match(/SENASA\s*(?:N[°ºo]\.?|Nro\.?|Registro)?\s*[:\-]?\s*([\d][\d.\-/]{2,})/i);
  return m ? m[1].trim() : null;
}

/** El nombre comercial suele ser la línea más destacada al inicio del documento: probamos las
 *  primeras líneas no vacías, descartando las que son sólo el tipo de producto o muy cortas/largas. */
function detectarNombreComercial(texto: string): string | null {
  const lineas = texto
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  for (const linea of lineas.slice(0, 15)) {
    if (linea.length < 3 || linea.length > 60) continue;
    if (TIPOS.some(({ patron }) => patron.test(linea)) && linea.split(/\s+/).length <= 3) continue;
    if (/^(hoja de datos|ficha t[eé]cnica|etiqueta|senasa)/i.test(linea)) continue;
    return linea;
  }
  return null;
}

/** Busca fragmentos con patrón "<nombre> ... <número> <unidad>" (g/L, g/kg, %, cc/L), típico de
 *  la sección de composición/ingrediente activo. Nos quedamos con las primeras 5 coincidencias
 *  para no arrastrar ruido de otras tablas del documento (dosis, envases, etc.). */
function detectarPrincipiosActivos(texto: string): PrincipioActivoExtraido[] {
  const regex = /([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ0-9\-\s]{2,45}?)[\s.:]{1,4}([\d]+(?:[.,]\d+)?)\s*(%|g\/l|g\/kg|gr\/l|cc\/l)/gi;
  const vistos = new Set<string>();
  const resultado: PrincipioActivoExtraido[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(texto)) && resultado.length < 5) {
    const nombre = m[1].trim().replace(/\s+/g, " ");
    const clave = nombre.toLowerCase();
    if (nombre.length < 3 || vistos.has(clave)) continue;
    vistos.add(clave);
    resultado.push({
      nombre,
      concentracion: Number(m[2].replace(",", ".")),
      unidad: m[3].toLowerCase() === "%" ? "%" : m[3].toLowerCase(),
    });
  }
  return resultado;
}

export function analizarTextoProducto(textoCrudo: string): ExtraccionPdfProducto {
  const texto = textoCrudo.replace(/\r/g, "");
  const textoInsuficiente = texto.trim().length < 40;

  return {
    nombreComercial: textoInsuficiente ? null : detectarNombreComercial(texto),
    tipos: textoInsuficiente ? [] : detectarTipos(texto),
    formulacion: textoInsuficiente ? null : detectarFormulacion(texto),
    principiosActivos: textoInsuficiente ? [] : detectarPrincipiosActivos(texto),
    registroSenasa: textoInsuficiente ? null : detectarRegistroSenasa(texto),
    textoInsuficiente,
    textoExtraido: texto.slice(0, 4000),
  };
}

export async function extraerDatosProductoDesdePdf(buffer: Buffer): Promise<ExtraccionPdfProducto> {
  const { text } = await pdfParse(buffer);
  return analizarTextoProducto(text);
}
