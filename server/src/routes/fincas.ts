import { prisma } from "../lib/prisma";
import { crudRouter } from "../lib/crudRouter";

export const fincasRouter = crudRouter(prisma.finca, {
  include: {
    sectores: {
      include: {
        cuadros: {
          include: {
            campanas: { where: { estado: "ACTIVA" }, include: { cultivo: true } },
          },
        },
      },
    },
  },
  orderBy: { nombre: "asc" },
});
