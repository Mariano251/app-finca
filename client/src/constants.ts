/** Imagenes vienen como URL absoluta de Supabase Storage; se deja el prefijo "/" como fallback
 * por si en algún entorno viejo quedara un path relativo. Una foto sacada offline y todavía sin
 * sincronizar vive como object URL local (`blob:...`), que también hay que dejar pasar tal cual. */
export function resolveImageUrl(path: string): string {
  return path.startsWith("http") || path.startsWith("blob:") ? path : `/${path}`;
}

export const RIEGO_OPTIONS = [
  { value: "GOTEO", label: "Goteo" },
  { value: "ASPERSION", label: "Aspersión" },
  { value: "GRAVEDAD", label: "Gravedad" },
  { value: "PIVOTE", label: "Pivote" },
  { value: "MICROASPERSION", label: "Microaspersión" },
  { value: "SECANO", label: "Secano" },
  { value: "OTRO", label: "Otro" },
];

export const ESTADO_CAMPANA_OPTIONS = [
  { value: "PLANIFICADA", label: "Planificada" },
  { value: "ACTIVA", label: "Activa" },
  { value: "COSECHADA", label: "Cosechada" },
  { value: "FINALIZADA", label: "Finalizada" },
  { value: "CANCELADA", label: "Cancelada" },
];

export const NIVEL_INFESTACION_OPTIONS = [
  { value: "BAJO", label: "Bajo" },
  { value: "MEDIO", label: "Medio" },
  { value: "ALTO", label: "Alto" },
];

export const NIVEL_SEVERIDAD_OPTIONS = [
  { value: "LEVE", label: "Leve" },
  { value: "MODERADA", label: "Moderada" },
  { value: "SEVERA", label: "Severa" },
];

export const ESTADO_TAREA_OPTIONS = [
  { value: "PLANIFICADA", label: "Planificada" },
  { value: "REALIZADA", label: "Realizada" },
];

export const TIPO_LABOR_OPTIONS = [
  { value: "PREPARACION_SUELO", label: "Preparación de suelo" },
  { value: "PLANTACION", label: "Plantación" },
  { value: "FERTILIZACION", label: "Fertilización" },
  { value: "RIEGO", label: "Riego" },
  { value: "PODA", label: "Poda" },
  { value: "DESMALEZADO", label: "Desmalezado" },
  { value: "APLICACION", label: "Aplicación" },
  { value: "COSECHA", label: "Cosecha" },
  { value: "OTRO", label: "Otro" },
];

export const TIPO_FITOSANITARIO_OPTIONS = [
  { value: "FUNGICIDA", label: "Fungicida" },
  { value: "INSECTICIDA", label: "Insecticida" },
  { value: "HERBICIDA", label: "Herbicida" },
  { value: "ACARICIDA", label: "Acaricida" },
  { value: "NEMATICIDA", label: "Nematicida" },
  { value: "OTRO", label: "Otro" },
];

/** Sobre qué base se expresa la dosis, para poder calcular la cantidad de producto realmente
 * usada (y de ahí el costo real) en vez de tener que cargarla a mano. */
export const BASE_DOSIS_OPTIONS = [
  { value: "HECTAREA", label: "Por hectárea (ej: L/ha, kg/ha)" },
  { value: "CALDO", label: "Por volumen de caldo (ej: cc/100L, g/100L)" },
];

export const TIPO_EVENTO_CLIMATICO_OPTIONS = [
  { value: "HELADA", label: "Helada" },
  { value: "GRANIZO", label: "Granizo" },
  { value: "VIENTO", label: "Viento" },
  { value: "ALTA_TEMPERATURA", label: "Alta temperatura" },
  { value: "LLUVIA", label: "Lluvia" },
  { value: "SEQUIA", label: "Sequía" },
  { value: "OTRO", label: "Otro" },
];

export const CATEGORIA_COSTO_OPTIONS = [
  { value: "SEMILLA", label: "Semilla" },
  { value: "FERTILIZANTE", label: "Fertilizante" },
  { value: "FITOSANITARIO", label: "Fitosanitario" },
  { value: "MANO_OBRA", label: "Mano de obra" },
  { value: "MAQUINARIA", label: "Maquinaria" },
  { value: "RIEGO", label: "Riego" },
  { value: "COMBUSTIBLE", label: "Combustible" },
  { value: "COSECHA", label: "Cosecha" },
  { value: "FLETE", label: "Flete" },
  { value: "OTRO", label: "Otro" },
];

export const CATEGORIA_INSUMO_OPTIONS = [
  { value: "FITOSANITARIO", label: "Fitosanitario" },
  { value: "FERTILIZANTE", label: "Fertilizante" },
  { value: "COMBUSTIBLE", label: "Combustible" },
  { value: "SEMILLA", label: "Semilla" },
  { value: "OTRO", label: "Otro" },
];

export const TIPO_MOVIMIENTO_OPTIONS = [
  { value: "ENTRADA", label: "Entrada manual" },
  { value: "SALIDA", label: "Salida (consumo)" },
  { value: "AJUSTE", label: "Ajuste de inventario" },
];

export const METODO_DISTRIBUCION_OPTIONS = [
  { value: "POR_SUPERFICIE", label: "Por superficie implantada" },
  { value: "POR_PORCENTAJE_COSTOS_DIRECTOS", label: "% de costos directos" },
  { value: "POR_PRODUCCION", label: "Por producción (kg)" },
  { value: "POR_VALOR_PRODUCCION", label: "Por valor de producción" },
  { value: "MANUAL", label: "Manual (asignación por campaña)" },
];

export const CULTIVO_COLOR_PALETTE = [
  "#3f7d3f",
  "#c2703d",
  "#4472ca",
  "#b3413a",
  "#8a5fc2",
  "#c2a53d",
  "#3d9ba8",
  "#c23d8f",
  "#6b8f3d",
  "#8f6b3d",
];

export function colorForCultivo(nombre?: string | null): string {
  if (!nombre) return "#4a7c2c";
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
  return CULTIVO_COLOR_PALETTE[Math.abs(hash) % CULTIVO_COLOR_PALETTE.length];
}

/** Semáforo verde/amarillo/rojo para marcar enfermedades en el croquis según su nivel de
 * incidencia (mismos valores que NIVEL_INFESTACION_OPTIONS). */
export function colorForNivelInfestacion(nivel?: string | null): string {
  switch (nivel) {
    case "BAJO":
      return "#5a9a4a";
    case "MEDIO":
      return "#c2a53d";
    case "ALTO":
      return "#b3413a";
    default:
      return "#8a5fc2";
  }
}
