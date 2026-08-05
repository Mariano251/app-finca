import { prisma } from "../lib/prisma";
import { nestedCrudRouter } from "../lib/crudRouter";

export const labores = nestedCrudRouter(prisma.laborCultural, "campanaId", {
  dateFields: ["fecha"],
  orderBy: { fecha: "desc" },
});

export const aplicaciones = nestedCrudRouter(prisma.aplicacionFitosanitaria, "campanaId", {
  dateFields: ["fecha"],
  orderBy: { fecha: "desc" },
});

export const fertilizaciones = nestedCrudRouter(prisma.fertilizacion, "campanaId", {
  dateFields: ["fecha"],
  orderBy: { fecha: "desc" },
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
});

export const enfermedades = nestedCrudRouter(prisma.enfermedad, "campanaId", {
  dateFields: ["fecha"],
  orderBy: { fecha: "desc" },
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
