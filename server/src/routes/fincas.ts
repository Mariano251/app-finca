import { prisma } from "../lib/prisma";
import { crudRouter } from "../lib/crudRouter";

export const fincasRouter = crudRouter(prisma.finca, {
  include: { sectores: { include: { cuadros: true } } },
  orderBy: { nombre: "asc" },
});
