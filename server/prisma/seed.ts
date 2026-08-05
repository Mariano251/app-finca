import { createPrismaClient } from "../src/lib/prismaClient";

const prisma = createPrismaClient();

async function main() {
  const existing = await prisma.finca.findFirst();
  if (existing) {
    console.log("Ya existen datos, se omite el seed.");
    return;
  }

  const finca = await prisma.finca.create({
    data: {
      nombre: "Finca Ejemplo",
      ubicacion: "Mendoza, Argentina",
      superficieTotal: 50,
      sectores: {
        create: [
          {
            nombre: "Sector Norte",
            cuadros: {
              create: [
                { nombre: "Cuadro 1", superficie: 3.5, sistemaRiego: "GOTEO" },
                { nombre: "Cuadro 2", superficie: 4.2, sistemaRiego: "ASPERSION" },
              ],
            },
          },
          {
            nombre: "Sector Sur",
            cuadros: {
              create: [{ nombre: "Cuadro 3", superficie: 5.0, sistemaRiego: "GRAVEDAD" }],
            },
          },
        ],
      },
    },
  });

  const ajo = await prisma.cultivo.create({
    data: { nombre: "Ajo", nombreCientifico: "Allium sativum" },
  });
  await prisma.cultivo.createMany({
    data: [
      { nombre: "Cebolla", nombreCientifico: "Allium cepa" },
      { nombre: "Papa", nombreCientifico: "Solanum tuberosum" },
      { nombre: "Tomate", nombreCientifico: "Solanum lycopersicum" },
    ],
  });
  await prisma.variedad.create({ data: { cultivoId: ajo.id, nombre: "Colorado" } });

  console.log(`Seed creado: finca #${finca.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
