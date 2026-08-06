import type { MutationRow } from "./db";

const METHOD_LABEL: Record<MutationRow["method"], string> = {
  create: "Crear",
  update: "Editar",
  delete: "Borrar",
};

const RESOURCE_LABEL: Record<string, string> = {
  "/fincas": "finca",
  "/sectores": "sector",
  "/cuadros": "cuadro",
  "/cultivos": "cultivo",
  "/variedades": "variedad",
  "/insumos": "insumo",
  "/campanas": "campaña",
  "/labores": "labor",
  "/aplicaciones": "aplicación fitosanitaria",
  "/fertilizaciones": "fertilización",
  "/riegos": "riego",
  "/fenologias": "fenología",
  "/eventos-climaticos": "evento climático",
  "/malezas": "maleza",
  "/enfermedades": "enfermedad",
  "/plagas": "plaga",
  "/comentarios": "comentario",
  "/cosechas": "cosecha",
  "/costos": "costo",
  "/ventas": "venta",
};

function resourceLabel(resource: string): string {
  if (RESOURCE_LABEL[resource]) return RESOURCE_LABEL[resource];
  // Recursos anidados tipo /campanas/5/labores: el nombre está en el último segmento.
  const lastSegment = "/" + resource.split("/").filter(Boolean).pop();
  return RESOURCE_LABEL[lastSegment] ?? resource;
}

const HINT_FIELDS = [
  "nombre",
  "descripcion",
  "texto",
  "producto",
  "productoComercial",
  "especie",
  "estadoFenologico",
  "responsable",
];

function payloadHint(payload?: Record<string, unknown>): string | undefined {
  if (!payload) return undefined;
  for (const key of HINT_FIELDS) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}

/** Texto corto y legible para mostrar una mutación de la cola en el panel de sync, ej.
 *  `Crear labor: "Fumigación lote 3"`. */
export function describeMutation(item: MutationRow): string {
  const method = METHOD_LABEL[item.method];
  const resource = resourceLabel(item.resource);
  const hint = payloadHint(item.payload);
  return hint ? `${method} ${resource}: "${hint}"` : `${method} ${resource}`;
}
