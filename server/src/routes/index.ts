import { Router } from "express";
import { fincasRouter } from "./fincas";
import { sectoresRouter } from "./sectores";
import { cuadrosRouter } from "./cuadros";
import { cultivosRouter } from "./cultivos";
import { variedadesRouter } from "./variedades";
import { campanasRouter } from "./campanas";
import { imagenesRouter } from "./imagenes";
import { croquisRouter, poligonosRouter } from "./croquis";
import {
  labores,
  aplicaciones,
  fertilizaciones,
  riegos,
  fenologias,
  eventosClimaticos,
  malezas,
  enfermedades,
  plagas,
  comentarios,
  cosechas,
  costos,
  ventas,
  presupuestos,
} from "./subregistros";
import { conocimientoRouter } from "./conocimiento";
import { rendimientoRouter } from "./rendimiento";
import { economiaRouter } from "./economia";
import { dashboardRouter } from "./dashboard";
import { busquedaRouter } from "./busqueda";
import { insumosRouter, movimientosRouter } from "./insumos";
import { comprasNestedRouter, comprasStandaloneRouter } from "./compras";
import { costosIndirectosRouter, asignacionesRouter } from "./costosIndirectos";

export const apiRouter = Router();

apiRouter.use("/fincas", fincasRouter);
apiRouter.use("/sectores", sectoresRouter);
apiRouter.use("/cuadros", cuadrosRouter);
apiRouter.use("/cultivos", cultivosRouter);
apiRouter.use("/variedades", variedadesRouter);
apiRouter.use("/campanas", campanasRouter);
apiRouter.use("/imagenes", imagenesRouter);
apiRouter.use("/croquis", croquisRouter);
apiRouter.use("/poligonos", poligonosRouter);
apiRouter.use("/aplicaciones", busquedaRouter);

const subrecursos: [string, { nested: Router; standalone: Router }][] = [
  ["labores", labores],
  ["aplicaciones", aplicaciones],
  ["fertilizaciones", fertilizaciones],
  ["riegos", riegos],
  ["fenologias", fenologias],
  ["eventos-climaticos", eventosClimaticos],
  ["malezas", malezas],
  ["enfermedades", enfermedades],
  ["plagas", plagas],
  ["comentarios", comentarios],
  ["cosechas", cosechas],
  ["costos", costos],
  ["ventas", ventas],
  ["presupuestos", presupuestos],
];

for (const [name, { nested, standalone }] of subrecursos) {
  apiRouter.use(`/campanas/:campanaId/${name}`, nested);
  apiRouter.use(`/${name}`, standalone);
}

apiRouter.use("/conocimiento", conocimientoRouter);
apiRouter.use("/rendimiento", rendimientoRouter);
apiRouter.use("/economia", economiaRouter);
apiRouter.use("/dashboard", dashboardRouter);
apiRouter.use("/insumos/:insumoId/movimientos", movimientosRouter);
apiRouter.use("/insumos/:insumoId/compras", comprasNestedRouter);
apiRouter.use("/insumos", insumosRouter);
apiRouter.use("/compras", comprasStandaloneRouter);
apiRouter.use("/costos-indirectos/:costoIndirectoId/asignaciones", asignacionesRouter);
apiRouter.use("/costos-indirectos", costosIndirectosRouter);
