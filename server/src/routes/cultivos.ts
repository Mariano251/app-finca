import { prisma } from "../lib/prisma";
import { crudRouter } from "../lib/crudRouter";
import { anioDe, resumenCosechas } from "../lib/aggregates";

export const cultivosRouter = crudRouter(prisma.cultivo, {
  filterFields: ["activo"],
  boolFilterFields: ["activo"],
  include: { variedades: true },
  orderBy: { nombre: "asc" },
});

cultivosRouter.get("/:id/historial", async (req, res, next) => {
  try {
    const cultivoId = Number(req.params.id);
    const campanas = await prisma.campana.findMany({
      where: { cultivoId },
      include: {
        cuadro: { include: { sector: { include: { finca: true } } } },
        variedad: true,
        cosechas: true,
        costos: true,
        ventas: true,
        enfermedades: true,
        plagas: true,
        malezas: true,
        aplicaciones: true,
      },
      orderBy: { fechaPlantacion: "desc" },
    });

    const historial = campanas.map((c) => {
      const costoTotal = c.costos.reduce((s, x) => s + x.monto, 0);
      const ingresoTotal = c.ventas.reduce((s, x) => s + x.ingresoTotal, 0);
      const { produccionTotal, rendimientoPorHa } = resumenCosechas(c.cosechas);
      return {
        campanaId: c.id,
        campanaNombre: c.nombre,
        cuadroId: c.cuadro.id,
        cuadro: c.cuadro.nombre,
        finca: c.cuadro.sector.finca.nombre,
        superficie: c.superficieImplantada,
        variedad: c.variedad?.nombre ?? null,
        anio: anioDe(c.fechaPlantacion),
        fechaPlantacion: c.fechaPlantacion,
        fechaCosechaReal: c.fechaCosechaReal,
        estado: c.estado,
        produccionTotal,
        rendimientoPorHa,
        calidad: c.cosechas.map((k) => k.calidad).filter(Boolean).join(", ") || null,
        enfermedades: Array.from(new Set(c.enfermedades.map((e) => e.nombre))),
        plagas: Array.from(new Set(c.plagas.map((p) => p.nombre))),
        malezas: Array.from(new Set(c.malezas.map((m) => m.especie))),
        productosFitosanitarios: Array.from(new Set(c.aplicaciones.map((a) => a.productoComercial))),
        costoTotal,
        ingresoTotal,
        margenBruto: ingresoTotal - costoTotal,
        precioVentaPromedio:
          c.ventas.length > 0
            ? c.ventas.reduce((s, v) => s + v.precioUnitario, 0) / c.ventas.length
            : null,
      };
    });

    res.json(historial);
  } catch (e) {
    next(e);
  }
});
