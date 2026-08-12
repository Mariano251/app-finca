import type { ColumnSchema } from "../../components/RecordList";
import type { FieldSchema } from "../../components/RecordForm";
import type { CategoriaInsumo, Insumo, TipoEntidadImagen } from "../../api/types";
import {
  BASE_DOSIS_OPTIONS,
  CATEGORIA_COSTO_OPTIONS,
  ESTADO_TAREA_OPTIONS,
  NIVEL_INFESTACION_OPTIONS,
  NIVEL_SEVERIDAD_OPTIONS,
  TIPO_EVENTO_CLIMATICO_OPTIONS,
  TIPO_FITOSANITARIO_OPTIONS,
  TIPO_LABOR_OPTIONS,
} from "../../constants";

export type TipoProblema = "enfermedad" | "plaga" | "maleza";

export interface FieldsCtx {
  insumos: Insumo[];
  /** Nombres ya cargados de cada tipo de problema sanitario, para sugerir en vez de re-tipear
   *  (ver campoNombreSugerido) y así evitar duplicados por error de ortografía. */
  nombresExistentes: Record<TipoProblema, string[]>;
}

export interface SubRecordConfig {
  path: string;
  label: string;
  entityType?: TipoEntidadImagen;
  fields: FieldSchema[] | ((ctx: FieldsCtx) => FieldSchema[]);
  columns: ColumnSchema<any>[];
  /** Ver RecordList.isReadOnly — usado por "costos" para los generados desde consumo de stock. */
  isReadOnly?: (item: any) => boolean;
  /** Habilita el botón "Copiar a otros cuadros" (ver ReplicarModal) — problemas sanitarios que
   *  suelen relevarse en varios cuadros el mismo recorrido, sin recargar todos los datos. */
  replicable?: boolean;
}

/** Appends the optional "insumo del stock" + "cantidad utilizada" fields, filtered by category
 * when one applies (e.g. only fitosanitarios for the Aplicaciones form). Linking an insumo here
 * makes the corresponding stock deduction automatic — leaving it unset keeps the old free-text
 * product field working exactly as before. */
function conInsumoOpcional(base: FieldSchema[], categoria?: CategoriaInsumo, cantidadPlaceholder?: string) {
  return (ctx: FieldsCtx): FieldSchema[] => {
    const opciones = ctx.insumos
      .filter((i) => !categoria || i.categoria === categoria)
      .map((i) => ({
        value: String(i.id),
        label: `${i.nombre} (${i.stockActual} ${i.unidad}${
          i.costoUnitario != null ? ` · $${i.costoUnitario.toLocaleString("es-AR")}/${i.unidad}` : ""
        })`,
      }));
    return [
      ...base,
      { name: "insumoId", label: "Insumo del stock (opcional)", type: "select", options: opciones },
      {
        name: "cantidadUtilizada",
        label: "Cantidad utilizada",
        type: "number",
        step: "0.01",
        placeholder: cantidadPlaceholder,
      },
    ];
  };
}

/** Campo de texto libre con sugerencias (datalist) de los nombres ya cargados para ese tipo de
 *  problema — dejar elegir un existente evita duplicar la misma enfermedad/plaga/maleza con una
 *  variante mal escrita, sin impedir cargar una nueva. */
function campoNombreSugerido(name: string, label: string, tipo: TipoProblema, ctx: FieldsCtx): FieldSchema {
  const opciones = [...ctx.nombresExistentes[tipo]]
    .sort((a, b) => a.localeCompare(b, "es"))
    .map((n) => ({ value: n, label: n }));
  return { name, label, type: "combobox", required: true, options: opciones };
}

function fecha(label = "Fecha"): FieldSchema {
  return { name: "fecha", label, type: "date", required: true };
}

function fechaOpcional(label = "Fecha"): FieldSchema {
  return { name: "fecha", label, type: "date" };
}

function fechaCol(): ColumnSchema<any> {
  return {
    key: "fecha",
    label: "Fecha",
    render: (r) => (r.fecha ? new Date(r.fecha).toLocaleDateString() : "—"),
  };
}

function labelFor(options: { value: string; label: string }[], value?: string | null) {
  return options.find((o) => o.value === value)?.label ?? value ?? "—";
}

/** Costo real del insumo consumido (cantidadUtilizada × costoUnitario vigente del insumo), el
 *  mismo monto que crearCostoAutomatico vuelca a "Costos" — se muestra acá para que el costo
 *  quede visible al lado del registro, sin tener que ir a revisar la pestaña de Costos. */
function costoCol(): ColumnSchema<any> {
  return {
    key: "costo",
    label: "Costo",
    render: (r) =>
      r.cantidadUtilizada != null && r.insumo?.costoUnitario != null
        ? (r.cantidadUtilizada * r.insumo.costoUnitario).toLocaleString("es-AR", { style: "currency", currency: "ARS" })
        : "—",
  };
}

export const SUB_RECORD_CONFIGS: SubRecordConfig[] = [
  {
    path: "labores",
    label: "Labores culturales",
    entityType: "LABOR",
    replicable: true,
    fields: conInsumoOpcional([
      fecha(),
      { name: "tipo", label: "Tipo", type: "select", options: TIPO_LABOR_OPTIONS, required: true },
      { name: "descripcion", label: "Descripción", type: "textarea", fullWidth: true },
      { name: "responsable", label: "Responsable", type: "text" },
      { name: "estado", label: "Estado", type: "select", options: ESTADO_TAREA_OPTIONS },
      { name: "notas", label: "Notas", type: "textarea", fullWidth: true },
    ]),
    columns: [
      fechaCol(),
      { key: "tipo", label: "Tipo", render: (r) => labelFor(TIPO_LABOR_OPTIONS, r.tipo) },
      { key: "descripcion", label: "Descripción" },
      { key: "responsable", label: "Responsable" },
      { key: "estado", label: "Estado", render: (r) => labelFor(ESTADO_TAREA_OPTIONS, r.estado) },
      {
        key: "cantidadUtilizada",
        label: "Cantidad usada",
        render: (r) => (r.cantidadUtilizada != null && r.insumo ? `${r.cantidadUtilizada} ${r.insumo.unidad}` : "—"),
      },
      costoCol(),
    ],
  },
  {
    path: "aplicaciones",
    label: "Fitosanitarios",
    entityType: "APLICACION",
    replicable: true,
    fields: conInsumoOpcional(
      [
        fecha(),
        { name: "productoComercial", label: "Producto comercial", type: "text", required: true },
        { name: "principioActivo", label: "Principio activo", type: "text" },
        { name: "tipo", label: "Tipo", type: "select", options: TIPO_FITOSANITARIO_OPTIONS, required: true },
        { name: "dosis", label: "Dosis", type: "number", step: "0.01" },
        { name: "unidadDosis", label: "Unidad de dosis", type: "text", placeholder: "cc/100L" },
        { name: "baseDosis", label: "Base de la dosis", type: "select", options: BASE_DOSIS_OPTIONS },
        { name: "volumenCaldo", label: "Volumen de caldo (L)", type: "number", step: "0.1" },
        { name: "superficieTratada", label: "Superficie tratada (ha)", type: "number", step: "0.01" },
        { name: "problemaObjetivo", label: "Problema objetivo", type: "text" },
        { name: "estadoCultivo", label: "Estado del cultivo", type: "text" },
        { name: "responsable", label: "Responsable", type: "text" },
        { name: "estado", label: "Estado", type: "select", options: ESTADO_TAREA_OPTIONS },
        { name: "observaciones", label: "Observaciones", type: "textarea", fullWidth: true },
      ],
      "FITOSANITARIO",
      "se calcula solo a partir de la dosis + superficie/caldo si lo dejás vacío"
    ),
    columns: [
      fechaCol(),
      { key: "productoComercial", label: "Producto" },
      { key: "tipo", label: "Tipo", render: (r) => labelFor(TIPO_FITOSANITARIO_OPTIONS, r.tipo) },
      { key: "dosis", label: "Dosis", render: (r) => (r.dosis != null ? `${r.dosis} ${r.unidadDosis ?? ""}` : "—") },
      {
        key: "cantidadUtilizada",
        label: "Cantidad usada",
        render: (r) => (r.cantidadUtilizada != null && r.insumo ? `${r.cantidadUtilizada} ${r.insumo.unidad}` : "—"),
      },
      costoCol(),
      { key: "problemaObjetivo", label: "Problema objetivo" },
      { key: "responsable", label: "Responsable" },
    ],
  },
  {
    path: "fertilizaciones",
    label: "Fertilización",
    entityType: "FERTILIZACION",
    replicable: true,
    fields: conInsumoOpcional(
      [
        fecha(),
        { name: "producto", label: "Producto", type: "text", required: true },
        { name: "dosis", label: "Dosis", type: "number", step: "0.01" },
        { name: "unidadDosis", label: "Unidad de dosis", type: "text" },
        { name: "nUnidades", label: "N (unidades)", type: "number", step: "0.1" },
        { name: "pUnidades", label: "P (unidades)", type: "number", step: "0.1" },
        { name: "kUnidades", label: "K (unidades)", type: "number", step: "0.1" },
        { name: "otrosNutrientes", label: "Otros nutrientes", type: "text" },
        { name: "formaAplicacion", label: "Forma de aplicación", type: "text" },
        { name: "responsable", label: "Responsable", type: "text" },
        { name: "observaciones", label: "Observaciones", type: "textarea", fullWidth: true },
      ],
      "FERTILIZANTE"
    ),
    columns: [
      fechaCol(),
      { key: "producto", label: "Producto" },
      { key: "dosis", label: "Dosis", render: (r) => (r.dosis != null ? `${r.dosis} ${r.unidadDosis ?? ""}` : "—") },
      {
        key: "npk",
        label: "N-P-K",
        render: (r) => `${r.nUnidades ?? "—"} / ${r.pUnidades ?? "—"} / ${r.kUnidades ?? "—"}`,
      },
      {
        key: "cantidadUtilizada",
        label: "Cantidad usada",
        render: (r) => (r.cantidadUtilizada != null && r.insumo ? `${r.cantidadUtilizada} ${r.insumo.unidad}` : "—"),
      },
      costoCol(),
      { key: "responsable", label: "Responsable" },
    ],
  },
  {
    path: "riegos",
    label: "Riego",
    entityType: "RIEGO",
    fields: [
      fecha(),
      { name: "duracionHoras", label: "Duración (hs)", type: "number", step: "0.1" },
      { name: "volumenEstimado", label: "Volumen estimado", type: "number", step: "0.1" },
      { name: "responsable", label: "Responsable", type: "text" },
      { name: "observaciones", label: "Observaciones", type: "textarea", fullWidth: true },
    ],
    columns: [
      fechaCol(),
      { key: "duracionHoras", label: "Duración (hs)" },
      { key: "volumenEstimado", label: "Volumen" },
      { key: "responsable", label: "Responsable" },
    ],
  },
  {
    path: "fenologias",
    label: "Fenología",
    fields: [
      fecha(),
      { name: "estadoFenologico", label: "Estado fenológico", type: "text", required: true },
      { name: "notas", label: "Notas", type: "textarea", fullWidth: true },
    ],
    columns: [fechaCol(), { key: "estadoFenologico", label: "Estado fenológico" }],
  },
  {
    path: "eventos-climaticos",
    label: "Clima y eventos",
    entityType: "EVENTO_CLIMATICO",
    fields: [
      fecha(),
      { name: "tipo", label: "Tipo", type: "select", options: TIPO_EVENTO_CLIMATICO_OPTIONS, required: true },
      { name: "severidad", label: "Severidad", type: "select", options: NIVEL_SEVERIDAD_OPTIONS },
      { name: "descripcion", label: "Descripción", type: "textarea", fullWidth: true },
      { name: "notas", label: "Notas", type: "textarea", fullWidth: true },
    ],
    columns: [
      fechaCol(),
      { key: "tipo", label: "Tipo", render: (r) => labelFor(TIPO_EVENTO_CLIMATICO_OPTIONS, r.tipo) },
      { key: "severidad", label: "Severidad", render: (r) => labelFor(NIVEL_SEVERIDAD_OPTIONS, r.severidad) },
      { key: "descripcion", label: "Descripción" },
    ],
  },
  {
    path: "malezas",
    label: "Malezas",
    entityType: "MALEZA",
    replicable: true,
    fields: (ctx: FieldsCtx) => [
      fecha(),
      campoNombreSugerido("especie", "Especie", "maleza", ctx),
      { name: "nivelInfestacion", label: "Nivel de infestación", type: "select", options: NIVEL_INFESTACION_OPTIONS },
      { name: "ubicacion", label: "Ubicación dentro del cuadro", type: "text" },
      { name: "tratamientoRealizado", label: "Tratamiento realizado", type: "textarea", fullWidth: true },
      { name: "responsable", label: "Responsable", type: "text" },
      { name: "notas", label: "Notas", type: "textarea", fullWidth: true },
    ],
    columns: [
      fechaCol(),
      { key: "especie", label: "Especie" },
      { key: "nivelInfestacion", label: "Nivel", render: (r) => labelFor(NIVEL_INFESTACION_OPTIONS, r.nivelInfestacion) },
      { key: "ubicacion", label: "Ubicación" },
      { key: "tratamientoRealizado", label: "Tratamiento" },
    ],
  },
  {
    path: "enfermedades",
    label: "Enfermedades",
    entityType: "ENFERMEDAD",
    replicable: true,
    fields: (ctx: FieldsCtx) => [
      fecha(),
      campoNombreSugerido("nombre", "Enfermedad", "enfermedad", ctx),
      { name: "nivelIncidencia", label: "Nivel de incidencia", type: "select", options: NIVEL_INFESTACION_OPTIONS },
      { name: "sectorAfectado", label: "Sector afectado", type: "text" },
      { name: "diagnostico", label: "Diagnóstico", type: "textarea", fullWidth: true },
      { name: "tratamientoRealizado", label: "Tratamiento realizado", type: "textarea", fullWidth: true },
      { name: "responsable", label: "Responsable", type: "text" },
      { name: "notas", label: "Notas", type: "textarea", fullWidth: true },
    ],
    columns: [
      fechaCol(),
      { key: "nombre", label: "Enfermedad" },
      { key: "nivelIncidencia", label: "Nivel", render: (r) => labelFor(NIVEL_INFESTACION_OPTIONS, r.nivelIncidencia) },
      { key: "diagnostico", label: "Diagnóstico" },
      { key: "tratamientoRealizado", label: "Tratamiento" },
    ],
  },
  {
    path: "plagas",
    label: "Plagas",
    entityType: "PLAGA",
    replicable: true,
    fields: (ctx: FieldsCtx) => [
      fecha(),
      campoNombreSugerido("nombre", "Plaga", "plaga", ctx),
      { name: "nivelPresencia", label: "Nivel de presencia", type: "select", options: NIVEL_INFESTACION_OPTIONS },
      { name: "danosObservados", label: "Daños observados", type: "textarea", fullWidth: true },
      { name: "tratamientoRealizado", label: "Tratamiento realizado", type: "textarea", fullWidth: true },
      { name: "responsable", label: "Responsable", type: "text" },
      { name: "notas", label: "Notas", type: "textarea", fullWidth: true },
    ],
    columns: [
      fechaCol(),
      { key: "nombre", label: "Plaga" },
      { key: "nivelPresencia", label: "Nivel", render: (r) => labelFor(NIVEL_INFESTACION_OPTIONS, r.nivelPresencia) },
      { key: "danosObservados", label: "Daños" },
      { key: "tratamientoRealizado", label: "Tratamiento" },
    ],
  },
  {
    path: "comentarios",
    label: "Comentarios",
    fields: [
      fecha(),
      { name: "texto", label: "Comentario", type: "textarea", required: true, fullWidth: true },
      { name: "categoria", label: "Categoría", type: "text" },
      { name: "responsable", label: "Responsable", type: "text" },
    ],
    columns: [fechaCol(), { key: "texto", label: "Comentario" }, { key: "categoria", label: "Categoría" }],
  },
  {
    path: "cosechas",
    label: "Cosecha",
    entityType: "COSECHA",
    fields: [
      fecha(),
      { name: "superficieCosechada", label: "Superficie cosechada (ha)", type: "number", step: "0.01" },
      { name: "produccionTotal", label: "Producción total (kg)", type: "number", step: "0.1" },
      { name: "rendimientoPorHa", label: "Rendimiento (kg/ha)", type: "number", step: "0.1", placeholder: "se calcula solo si lo dejás vacío" },
      { name: "calidad", label: "Calidad", type: "text" },
      { name: "descarte", label: "Descarte (kg)", type: "number", step: "0.1" },
      { name: "produccionComercial", label: "Producción comercial (kg)", type: "number", step: "0.1" },
      { name: "produccionNoComercial", label: "Producción no comercial (kg)", type: "number", step: "0.1" },
      { name: "notas", label: "Notas", type: "textarea", fullWidth: true },
    ],
    columns: [
      fechaCol(),
      { key: "produccionTotal", label: "Producción total (kg)" },
      {
        key: "rendimientoPorHa",
        label: "Rendimiento (kg/ha)",
        render: (r) =>
          r.rendimientoPorHa != null
            ? Number(r.rendimientoPorHa).toLocaleString("es-AR")
            : r.produccionTotal && r.superficieCosechada
              ? Math.round(r.produccionTotal / r.superficieCosechada).toLocaleString("es-AR")
              : "—",
      },
      { key: "calidad", label: "Calidad" },
    ],
  },
  {
    path: "costos",
    label: "Costos",
    fields: [
      { name: "categoria", label: "Categoría", type: "select", options: CATEGORIA_COSTO_OPTIONS, required: true },
      { name: "descripcion", label: "Descripción", type: "text" },
      { name: "monto", label: "Monto ($)", type: "number", step: "0.01", required: true },
      fechaOpcional(),
      { name: "notas", label: "Notas", type: "textarea", fullWidth: true },
    ],
    columns: [
      fechaCol(),
      { key: "categoria", label: "Categoría", render: (r) => labelFor(CATEGORIA_COSTO_OPTIONS, r.categoria) },
      { key: "descripcion", label: "Descripción" },
      { key: "monto", label: "Monto", render: (r) => Number(r.monto).toLocaleString("es-AR", { style: "currency", currency: "ARS" }) },
    ],
    // Costos con origen seteado vienen de un consumo de insumo (labor/aplicación/fertilización)
    // y se recalculan solos — editarlos/borrarlos a mano duplicaría el gasto real.
    isReadOnly: (r) => !!r.origen,
  },
  {
    path: "ventas",
    label: "Ventas",
    fields: [
      fecha(),
      { name: "cantidadKg", label: "Cantidad (kg)", type: "number", step: "0.1", required: true },
      { name: "precioUnitario", label: "Precio unitario ($/kg)", type: "number", step: "0.01", required: true },
      { name: "ingresoTotal", label: "Ingreso total ($)", type: "number", step: "0.01", placeholder: "se calcula solo si lo dejás vacío" },
      { name: "comprador", label: "Comprador", type: "text" },
      { name: "notas", label: "Notas", type: "textarea", fullWidth: true },
    ],
    columns: [
      fechaCol(),
      { key: "cantidadKg", label: "Cantidad (kg)" },
      { key: "precioUnitario", label: "Precio ($/kg)" },
      { key: "ingresoTotal", label: "Ingreso", render: (r) => Number(r.ingresoTotal).toLocaleString("es-AR", { style: "currency", currency: "ARS" }) },
      { key: "comprador", label: "Comprador" },
    ],
  },
];
