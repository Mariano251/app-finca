import { prisma } from "../lib/prisma";
import { crudRouter } from "../lib/crudRouter";

export const sectoresRouter = crudRouter(prisma.sector, {
  filterFields: ["fincaId"],
  intFilterFields: ["fincaId"],
  include: { cuadros: true },
  orderBy: { nombre: "asc" },
});
