import { prisma } from "../lib/prisma";
import { crudRouter } from "../lib/crudRouter";

export const campanasRouter = crudRouter(prisma.campana, {
  filterFields: ["cuadroId", "cultivoId", "estado"],
  intFilterFields: ["cuadroId", "cultivoId"],
  dateFields: ["fechaPlantacion", "fechaCosechaEstimada", "fechaCosechaReal"],
  dropNullFields: ["estado"],
  include: {
    cultivo: true,
    variedad: true,
    cuadro: { include: { sector: { include: { finca: true } } } },
    costos: true,
    ventas: true,
    cosechas: true,
    _count: {
      select: {
        laboresCulturales: true,
        aplicaciones: true,
        fertilizaciones: true,
        riegos: true,
        fenologias: true,
        eventosClimaticos: true,
        malezas: true,
        enfermedades: true,
        plagas: true,
        comentarios: true,
        cosechas: true,
        costos: true,
        ventas: true,
      },
    },
  },
  orderBy: { fechaPlantacion: "desc" },
});
