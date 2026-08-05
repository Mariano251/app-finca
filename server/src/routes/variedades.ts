import { prisma } from "../lib/prisma";
import { crudRouter } from "../lib/crudRouter";

export const variedadesRouter = crudRouter(prisma.variedad, {
  filterFields: ["cultivoId"],
  intFilterFields: ["cultivoId"],
  orderBy: { nombre: "asc" },
});
