import { prisma } from "../lib/prisma";
import { nestedCrudRouter } from "../lib/crudRouter";

function conInsumoCoercido(data: any) {
  if (data.insumoId !== undefined) data.insumoId = data.insumoId ? Number(data.insumoId) : null;
  if (data.cantidadUtilizada !== undefined) {
    data.cantidadUtilizada = data.cantidadUtilizada !== null && data.cantidadUtilizada !== "" ? Number(data.cantidadUtilizada) : null;
  }
  return data;
}

export const labores = nestedCrudRouter(prisma.laborCultural, "campanaId", {
  dateFields: ["fecha"],
  dropNullFields: ["estado"],
  orderBy: { fecha: "desc" },
  include: { insumo: true },
  beforeCreate: conInsumoCoercido,
  beforeUpdate: conInsumoCoercido,
  stock: {
    origen: "LABOR",
    getTxDelegate: (tx) => tx.laborCultural,
    motivo: (r) => `Labor: ${r.descripcion ?? r.tipo}`,
  },
});

/** Si no se cargó la cantidad usada a mano, la deriva de la dosis: por hectárea (dosis × superficie
 * tratada) o por volumen de caldo (dosis cada 100L × volumen de caldo aplicado). Así el costo real
 * (cantidad × costoUnitario del insumo) sale de la dosis efectivamente aplicada en vez de un número
 * suelto que el usuario podía olvidarse de cargar o cargar inconsistente con la dosis. */
function conCantidadDesdeDosis(data: any) {
  data = conInsumoCoercido(data);
  if (data.baseDosis === "") data.baseDosis = null;
  if ((data.cantidadUtilizada === null || data.cantidadUtilizada === undefined) && data.dosis != null) {
    if (data.baseDosis === "HECTAREA" && data.superficieTratada != null) {
      data.cantidadUtilizada = Number(data.dosis) * Number(data.superficieTratada);
    } else if (data.baseDosis === "CALDO" && data.volumenCaldo != null) {
      data.cantidadUtilizada = (Number(data.dosis) / 100) * Number(data.volumenCaldo);
    }
  }
  return data;
}

export const aplicaciones = nestedCrudRouter(prisma.aplicacionFitosanitaria, "campanaId", {
  dateFields: ["fecha"],
  dropNullFields: ["estado"],
  orderBy: { fecha: "desc" },
  include: { insumo: true },
  beforeCreate: conCantidadDesdeDosis,
  beforeUpdate: conCantidadDesdeDosis,
  stock: {
    origen: "APLICACION",
    getTxDelegate: (tx) => tx.aplicacionFitosanitaria,
    motivo: (r) => `Aplicación: ${r.productoComercial}`,
  },
});

export const fertilizaciones = nestedCrudRouter(prisma.fertilizacion, "campanaId", {
  dateFields: ["fecha"],
  orderBy: { fecha: "desc" },
  include: { insumo: true },
  beforeCreate: conInsumoCoercido,
  beforeUpdate: conInsumoCoercido,
  stock: {
    origen: "FERTILIZACION",
    getTxDelegate: (tx) => tx.fertilizacion,
    motivo: (r) => `Fertilización: ${r.producto}`,
  },
});

export const riegos = nestedCrudRouter(prisma.riego, "campanaId", {
  dateFields: ["fecha"],
  orderBy: { fecha: "desc" },
});

export const fenologias = nestedCrudRouter(prisma.fenologia, "campanaId", {
  dateFields: ["fecha"],
  orderBy: { fecha: "desc" },
});

export const eventosClimaticos = nestedCrudRouter(prisma.eventoClimatico, "campanaId", {
  dateFields: ["fecha"],
  orderBy: { fecha: "desc" },
});

export const malezas = nestedCrudRouter(prisma.maleza, "campanaId", {
  dateFields: ["fecha"],
  orderBy: { fecha: "desc" },
  beforeCreate: conUbicacionCoercida,
  beforeUpdate: conUbicacionCoercida,
});

function conUbicacionCoercida(data: any) {
  if (data.croquisId !== undefined) data.croquisId = data.croquisId !== null && data.croquisId !== "" ? Number(data.croquisId) : null;
  for (const f of ["croquisX", "croquisY", "radioMetros"]) {
    if (data[f] !== undefined) data[f] = data[f] !== null && data[f] !== "" ? Number(data[f]) : null;
  }
  return data;
}

export const enfermedades = nestedCrudRouter(prisma.enfermedad, "campanaId", {
  dateFields: ["fecha"],
  orderBy: { fecha: "desc" },
  beforeCreate: conUbicacionCoercida,
  beforeUpdate: conUbicacionCoercida,
});

export const plagas = nestedCrudRouter(prisma.plaga, "campanaId", {
  dateFields: ["fecha"],
  orderBy: { fecha: "desc" },
});

export const comentarios = nestedCrudRouter(prisma.comentario, "campanaId", {
  dateFields: ["fecha"],
  orderBy: { fecha: "desc" },
});

export const cosechas = nestedCrudRouter(prisma.cosecha, "campanaId", {
  dateFields: ["fecha"],
  orderBy: { fecha: "desc" },
});

export const costos = nestedCrudRouter(prisma.costo, "campanaId", {
  dateFields: ["fecha"],
  orderBy: { fecha: "desc" },
});

function conCategoriaPresupuestoCoercida(data: any) {
  if (data.categoria === "") data.categoria = null;
  return data;
}

export const presupuestos = nestedCrudRouter(prisma.presupuesto, "campanaId", {
  orderBy: { categoria: "asc" },
  beforeCreate: conCategoriaPresupuestoCoercida,
  beforeUpdate: conCategoriaPresupuestoCoercida,
});

function conIngresoCalculado(data: any) {
  if ((data.ingresoTotal === undefined || data.ingresoTotal === null) && data.cantidadKg != null && data.precioUnitario != null) {
    data.ingresoTotal = Number(data.cantidadKg) * Number(data.precioUnitario);
  }
  return data;
}

export const ventas = nestedCrudRouter(prisma.venta, "campanaId", {
  dateFields: ["fecha"],
  orderBy: { fecha: "desc" },
  beforeCreate: conIngresoCalculado,
  beforeUpdate: conIngresoCalculado,
});
