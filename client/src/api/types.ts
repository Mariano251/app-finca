export type SistemaRiego =
  | "GOTEO"
  | "ASPERSION"
  | "GRAVEDAD"
  | "PIVOTE"
  | "MICROASPERSION"
  | "SECANO"
  | "OTRO";

export type EstadoCampana = "PLANIFICADA" | "ACTIVA" | "COSECHADA" | "FINALIZADA" | "CANCELADA";
export type EstadoTarea = "PLANIFICADA" | "REALIZADA";

export type TipoLabor =
  | "PREPARACION_SUELO"
  | "PLANTACION"
  | "FERTILIZACION"
  | "RIEGO"
  | "PODA"
  | "DESMALEZADO"
  | "APLICACION"
  | "COSECHA"
  | "OTRO";

export type TipoFitosanitario =
  | "FUNGICIDA"
  | "INSECTICIDA"
  | "HERBICIDA"
  | "ACARICIDA"
  | "NEMATICIDA"
  | "OTRO";

export type NivelInfestacion = "BAJO" | "MEDIO" | "ALTO";
export type NivelSeveridad = "LEVE" | "MODERADA" | "SEVERA";

export type TipoEventoClimatico =
  | "HELADA"
  | "GRANIZO"
  | "VIENTO"
  | "ALTA_TEMPERATURA"
  | "LLUVIA"
  | "SEQUIA"
  | "OTRO";

export type CategoriaCosto =
  | "SEMILLA"
  | "FERTILIZANTE"
  | "FITOSANITARIO"
  | "MANO_OBRA"
  | "MAQUINARIA"
  | "RIEGO"
  | "COMBUSTIBLE"
  | "COSECHA"
  | "FLETE"
  | "OTRO";

export type CategoriaInsumo = "FITOSANITARIO" | "FERTILIZANTE" | "SEMILLA" | "OTRO";
export type TipoMovimientoStock = "ENTRADA" | "SALIDA" | "AJUSTE";
export type OrigenMovimiento = "MANUAL" | "APLICACION" | "FERTILIZACION" | "LABOR" | "COMPRA";
export type MetodoDistribucionCosto =
  | "POR_SUPERFICIE"
  | "POR_PORCENTAJE_COSTOS_DIRECTOS"
  | "POR_PRODUCCION"
  | "POR_VALOR_PRODUCCION"
  | "MANUAL";

export interface Insumo {
  id: number;
  /** null = insumo compartido/sin asignar a una finca en particular. */
  fincaId?: number | null;
  finca?: Finca | null;
  nombre: string;
  categoria: CategoriaInsumo;
  unidad: string;
  stockActual: number;
  stockMinimo?: number | null;
  costoUnitario?: number | null;
  notas?: string | null;
  activo: boolean;
}

export interface MovimientoStock {
  id: number;
  insumoId: number;
  tipo: TipoMovimientoStock;
  cantidad: number;
  fecha: string;
  origen: OrigenMovimiento;
  origenId?: number | null;
  motivo?: string | null;
  notas?: string | null;
}

export interface Compra {
  id: number;
  insumoId: number;
  fecha: string;
  cantidad: number;
  precioUnitario: number;
  montoTotal: number;
  proveedor?: string | null;
  factura?: string | null;
  lote?: string | null;
  vencimiento?: string | null;
  notas?: string | null;
}

export type TipoEntidadImagen =
  | "CAMPANA"
  | "LABOR"
  | "APLICACION"
  | "FERTILIZACION"
  | "RIEGO"
  | "MALEZA"
  | "ENFERMEDAD"
  | "PLAGA"
  | "EVENTO_CLIMATICO"
  | "COSECHA"
  | "CROQUIS"
  | "CUADRO";

export interface Finca {
  id: number;
  nombre: string;
  ubicacion?: string | null;
  superficieTotal?: number | null;
  notas?: string | null;
  sectores?: Sector[];
}

export interface Sector {
  id: number;
  fincaId: number;
  finca?: Finca;
  nombre: string;
  descripcion?: string | null;
  cuadros?: Cuadro[];
}

export interface Cuadro {
  id: number;
  sectorId: number;
  sector?: Sector;
  nombre: string;
  superficie?: number | null;
  ubicacion?: string | null;
  tipoSuelo?: string | null;
  caracteristicasSuelo?: string | null;
  sistemaRiego?: SistemaRiego | null;
  notas?: string | null;
  activo: boolean;
  campanas?: Campana[];
}

export interface Cultivo {
  id: number;
  nombre: string;
  nombreCientifico?: string | null;
  notas?: string | null;
  activo: boolean;
  variedades?: Variedad[];
}

export interface Variedad {
  id: number;
  cultivoId: number;
  cultivo?: Cultivo;
  nombre: string;
  notas?: string | null;
  activo: boolean;
}

export interface Costo {
  id: number;
  campanaId: number;
  categoria: CategoriaCosto;
  descripcion?: string | null;
  monto: number;
  fecha?: string | null;
  insumoId?: number | null;
  origen?: OrigenMovimiento | null;
  origenId?: number | null;
}

export interface CostoIndirectoAsignacion {
  id: number;
  costoIndirectoId: number;
  campanaId: number;
  campana?: Campana;
  monto: number;
}

export interface CostoIndirecto {
  id: number;
  fincaId?: number | null;
  categoria: string;
  descripcion?: string | null;
  monto: number;
  fecha: string;
  metodoDistribucion: MetodoDistribucionCosto;
  notas?: string | null;
  asignaciones?: CostoIndirectoAsignacion[];
}

export interface Presupuesto {
  id: number;
  campanaId: number;
  categoria?: CategoriaCosto | null;
  montoPresupuestado: number;
  notas?: string | null;
}

export interface Venta {
  id: number;
  campanaId: number;
  fecha: string;
  cantidadKg: number;
  precioUnitario: number;
  ingresoTotal: number;
  comprador?: string | null;
}

export interface Cosecha {
  id: number;
  campanaId: number;
  fecha: string;
  superficieCosechada?: number | null;
  produccionTotal?: number | null;
  rendimientoPorHa?: number | null;
  calidad?: string | null;
}

export interface Campana {
  id: number;
  cuadroId: number;
  cuadro?: Cuadro;
  cultivoId: number;
  cultivo?: Cultivo;
  variedadId?: number | null;
  variedad?: Variedad | null;
  nombre: string;
  fechaPlantacion?: string | null;
  fechaCosechaEstimada?: string | null;
  fechaCosechaReal?: string | null;
  estado: EstadoCampana;
  superficieImplantada?: number | null;
  notas?: string | null;
  costos?: Costo[];
  ventas?: Venta[];
  cosechas?: Cosecha[];
  _count?: Record<string, number>;
}

export interface Imagen {
  id: number;
  path: string;
  entityType: TipoEntidadImagen;
  entityId: number;
  descripcion?: string | null;
  fecha: string;
}

export interface Croquis {
  id: number;
  fincaId: number;
  imagenPath?: string | null;
  imagenAncho?: number | null;
  imagenAlto?: number | null;
  nombre?: string | null;
  escalaMetrosPorPixel?: number | null;
  escalaPuntoA?: { x: number; y: number } | null;
  escalaPuntoB?: { x: number; y: number } | null;
  escalaDistanciaM?: number | null;
  poligonos?: CroquisPoligono[];
  enfermedadesMarcadas?: Enfermedad[];
  malezasMarcadas?: Maleza[];
}

export interface CroquisPoligono {
  id: number;
  croquisId: number;
  cuadroId?: number | null;
  cuadro?: Cuadro | null;
  color: string;
  puntos: { x: number; y: number }[];
  etiqueta?: string | null;
}

export interface Enfermedad {
  id: number;
  campanaId: number;
  campana?: Campana | null;
  fecha: string;
  nombre: string;
  nivelIncidencia?: NivelInfestacion | null;
  sectorAfectado?: string | null;
  diagnostico?: string | null;
  tratamientoRealizado?: string | null;
  responsable?: string | null;
  notas?: string | null;
  croquisId?: number | null;
  croquisX?: number | null;
  croquisY?: number | null;
  radioMetros?: number | null;
}

export interface Maleza {
  id: number;
  campanaId: number;
  campana?: Campana | null;
  fecha: string;
  especie: string;
  nivelInfestacion?: NivelInfestacion | null;
  ubicacion?: string | null;
  tratamientoRealizado?: string | null;
  responsable?: string | null;
  notas?: string | null;
  croquisId?: number | null;
  croquisX?: number | null;
  croquisY?: number | null;
  radioMetros?: number | null;
}
