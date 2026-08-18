import * as fs from "fs";
import { prisma } from "../src/lib/prisma";
import type { TipoFitosanitario, Movilidad, TipoOrganismo } from "@prisma/client";

type Block = { num: number; nombre: string; text: string };
const blocks: Block[] = JSON.parse(
  fs.readFileSync("C:\\APP FINCA\\server\\scripts\\_blocks.json", "utf-8")
);
const blockByNum = new Map(blocks.map((b) => [b.num, b]));

type Override = {
  matchExisting?: string; // nombre exacto en DB si esta ficha completa un principio ya cargado
  nombreOverride?: string; // nombre a usar al crear (si difiere del texto crudo del bloque)
  tipo?: TipoFitosanitario;
  grupoAccion?: string;
  movilidad?: Movilidad;
  cultivos?: string[]; // subset del catalogo canonico de 12
  organismos?: [TipoOrganismo, string][]; // subset del catalogo existente
  riesgoResistencia?: string;
  skipStandalone?: boolean; // fichas de mezcla: no crear fila propia
  appendTo?: number[]; // a que fichas (num) se le agrega este texto como nota de mezcla
  extraPrefix?: string; // texto de advertencia especial (ej. DDVP)
};

// prettier-ignore
const OV: Record<number, Override> = {
  1:  { tipo: "INSECTICIDA", grupoAccion: "1B", movilidad: "CONTACTO", cultivos: ["AJO","CEBOLLA","PAPA"], organismos: [["PLAGA","TRIPS"],["PLAGA","PHYRDENUS"],["PLAGA","GUSANO"],["PLAGA","COCHINILLA"]] },
  2:  { tipo: "INSECTICIDA", movilidad: "OTRO", extraPrefix: "ADVERTENCIA: según la fuente NO es un insecticida de uso agrícola habitual — uso exclusivo de saneamiento ambiental.\n\n" },
  3:  { tipo: "INSECTICIDA", movilidad: "CONTACTO", cultivos: ["CEBOLLA","TOMATE"], organismos: [["PLAGA","TRIPS"]] },
  4:  { tipo: "INSECTICIDA", movilidad: "CONTACTO", organismos: [["ACARO","ARAÑUELA"]] },
  5:  { tipo: "INSECTICIDA", movilidad: "CONTACTO", cultivos: ["PAPA","REPOLLO","CEBOLLA","TOMATE"], organismos: [["PLAGA","COCHINILLA"],["PLAGA","PULGON"],["PLAGA","BICHO MORO"],["PLAGA","TRIPS"]] },
  6:  { tipo: "INSECTICIDA", movilidad: "CONTACTO", organismos: [["PLAGA","COCHINILLA"]] },
  7:  { tipo: "INSECTICIDA", movilidad: "CONTACTO", organismos: [["PLAGA","COCHINILLA"],["ACARO","ARAÑUELA"]] },
  8:  { matchExisting: "DIMETOATO", movilidad: "SISTEMICO", cultivos: ["AJO","CEBOLLA","TOMATE","PAPA"], organismos: [["PLAGA","TRIPS"],["PLAGA","PULGON"],["ACARO","ARAÑUELA"]] },
  9:  { tipo: "NEMATICIDA", cultivos: ["AJO","CEBOLLA","TOMATE","PAPA","ZAPALLO"], organismos: [["NEMATODO","NEMATODOS"]] },
  10: { tipo: "INSECTICIDA", movilidad: "SISTEMICO", cultivos: ["PAPA"], organismos: [["PLAGA","PULGON"],["PLAGA","TRIPS"],["PLAGA","ORUGA"]] },
  11: { tipo: "INSECTICIDA", movilidad: "CONTACTO", organismos: [["PLAGA","BICHO MORO"]] },
  12: { tipo: "INSECTICIDA", movilidad: "CONTACTO", cultivos: ["PAPA","ZAPALLO"], organismos: [["PLAGA","TUTA"]] },
  13: { tipo: "INSECTICIDA", movilidad: "CONTACTO", cultivos: ["TOMATE","PIMIENTO"], organismos: [["PLAGA","TRIPS"],["ACARO","ARAÑUELA"]] },
  14: { tipo: "INSECTICIDA", movilidad: "CONTACTO", cultivos: ["TOMATE"], organismos: [["PLAGA","ORUGA"],["PLAGA","PULGON"],["PLAGA","GUSANO DE SUELO"]] },
  15: { tipo: "INSECTICIDA", movilidad: "CONTACTO", cultivos: ["LECHUGA"], organismos: [["PLAGA","PULGON"]] },
  16: { matchExisting: "CARBOFURAN", movilidad: "SISTEMICO", cultivos: ["AJO","TOMATE","PAPA"], organismos: [["NEMATODO","NEMATODOS"],["PLAGA","PHYRDENUS"],["PLAGA","GUSANO DE SUELO"],["PLAGA","BICHO MORO"],["PLAGA","PULGON"]] },
  17: { matchExisting: "BIFENTRIN", movilidad: "CONTACTO", cultivos: ["PAPA"], organismos: [["PLAGA","PULGON"],["ACARO","ARAÑUELA"]] },
  18: { tipo: "INSECTICIDA", movilidad: "CONTACTO", cultivos: ["AJO","CEBOLLA","TOMATE"], organismos: [["PLAGA","TRIPS"],["PLAGA","TUTA"],["PLAGA","ORUGA"]] },
  19: { tipo: "INSECTICIDA", movilidad: "CONTACTO", cultivos: ["PAPA","PIMIENTO","TOMATE","REPOLLO"], organismos: [["PLAGA","TUTA"],["PLAGA","POLILLA (REPOLLO)"],["PLAGA","BICHO MORO"]] },
  20: { tipo: "INSECTICIDA", movilidad: "CONTACTO", cultivos: ["TOMATE"], organismos: [["PLAGA","TUTA"],["ACARO","ARAÑUELA"]] },
  21: { tipo: "INSECTICIDA", movilidad: "CONTACTO", cultivos: ["TOMATE"], organismos: [["PLAGA","TUTA"]] },
  22: { matchExisting: "LAMDACIALOTRINA", movilidad: "CONTACTO", cultivos: ["TOMATE"], organismos: [["PLAGA","TUTA"],["PLAGA","TRIPS"]], riesgoResistencia: "La fuente menciona resistencias de trips (ajo/cebolla) a piretroides como este." },
  23: { tipo: "INSECTICIDA", movilidad: "CONTACTO", cultivos: ["PIMIENTO","TOMATE","MAIZ"], organismos: [["PLAGA","TUTA"],["PLAGA","ISOCA DEL MAIZ"]] },
  24: { tipo: "INSECTICIDA", cultivos: ["TOMATE"], organismos: [["PLAGA","COCHINILLA"]] },
  25: { tipo: "INSECTICIDA", movilidad: "TRANSLAMINAR", cultivos: ["TOMATE"] },
  26: { tipo: "INSECTICIDA", movilidad: "CONTACTO", organismos: [["PLAGA","ORUGA"]] },
  27: { tipo: "INSECTICIDA", movilidad: "CONTACTO", organismos: [["PLAGA","ORUGA"]] },
  28: { tipo: "INSECTICIDA", grupoAccion: "23", movilidad: "SISTEMICO", organismos: [["PLAGA","COCHINILLA"],["PLAGA","PULGON"],["PLAGA","TRIPS"]] },
  29: { matchExisting: "IMIDACLOPRID", movilidad: "SISTEMICO", cultivos: ["LECHUGA","PAPA","TOMATE"], organismos: [["PLAGA","PULGON"],["PLAGA","TRIPS"],["PLAGA","PHYRDENUS"],["PLAGA","MINADORA DE HOJA"],["PLAGA","GUSANO"]] },
  30: { tipo: "INSECTICIDA", cultivos: ["TOMATE"], organismos: [["PLAGA","PULGON"]] },
  31: { tipo: "INSECTICIDA", movilidad: "SISTEMICO", cultivos: ["PAPA","TOMATE","CEBOLLA"], organismos: [["PLAGA","PULGON"],["PLAGA","PHYRDENUS"],["PLAGA","TRIPS"]] },
  32: { tipo: "INSECTICIDA", cultivos: ["PAPA"], organismos: [["PLAGA","PULGON"]] },
  33: { tipo: "INSECTICIDA", movilidad: "SISTEMICO", cultivos: ["MAIZ"], organismos: [["PLAGA","GUSANO"]] },
  34: { tipo: "INSECTICIDA", nombreOverride: "DINOTEFURAN", movilidad: "SISTEMICO", cultivos: ["TOMATE"] },
  35: { tipo: "INSECTICIDA", movilidad: "SISTEMICO", organismos: [["PLAGA","PULGON"]] },
  36: { matchExisting: "ABAMECTINA", movilidad: "TRANSLAMINAR", cultivos: ["TOMATE","PIMIENTO"], organismos: [["PLAGA","TUTA"],["PLAGA","MINADORA DE HOJA"],["ACARO","ARAÑUELA"],["NEMATODO","NEMATODOS"]] },
  37: { tipo: "INSECTICIDA", movilidad: "TRANSLAMINAR", cultivos: ["TOMATE"], organismos: [["PLAGA","TUTA"],["PLAGA","TRIPS"],["PLAGA","MINADORA DE HOJA"],["ACARO","ARAÑUELA"]] },
  38: { tipo: "INSECTICIDA", grupoAccion: "28", movilidad: "CONTACTO", cultivos: ["TOMATE"], organismos: [["PLAGA","TUTA"],["PLAGA","PULGON"]] },
  39: { tipo: "INSECTICIDA", grupoAccion: "13", movilidad: "TRANSLAMINAR", cultivos: ["TOMATE"], organismos: [["PLAGA","TUTA"]] },
  40: { tipo: "INSECTICIDA", grupoAccion: "28", movilidad: "TRANSLAMINAR", cultivos: ["TOMATE"], organismos: [["PLAGA","PULGON"],["PLAGA","CHICHARRITA"],["PLAGA","TUTA"],["PLAGA","MINADORA DE HOJA"]] },
  41: { tipo: "INSECTICIDA", grupoAccion: "2B", movilidad: "CONTACTO" },
  42: { tipo: "INSECTICIDA", movilidad: "SISTEMICO", cultivos: ["PAPA"], organismos: [["PLAGA","PULGON"]] },
  43: { tipo: "INSECTICIDA", grupoAccion: "28", cultivos: ["TOMATE","ZAPALLO"], organismos: [["PLAGA","TUTA"]] },
  44: { tipo: "INSECTICIDA", movilidad: "CONTACTO", cultivos: ["MAIZ","REPOLLO","TOMATE"], organismos: [["PLAGA","TUTA"],["PLAGA","ORUGA"]] },
  45: { tipo: "INSECTICIDA", movilidad: "SISTEMICO", cultivos: ["PAPA","TOMATE"], organismos: [["PLAGA","PULGON"]] },
  46: { tipo: "INSECTICIDA", movilidad: "TRANSLAMINAR", organismos: [["PLAGA","TRIPS"]] },
  47: { matchExisting: "SPINOSAD", movilidad: "TRANSLAMINAR", cultivos: ["TOMATE"], organismos: [["PLAGA","TUTA"],["PLAGA","TRIPS"]] },
  48: { tipo: "INSECTICIDA" },
  49: { tipo: "ACARICIDA", movilidad: "CONTACTO", cultivos: ["AJO"], organismos: [["ACARO","ARAÑUELA"]] },
  50: { tipo: "ACARICIDA", movilidad: "CONTACTO", organismos: [["ACARO","ARAÑUELA"]] },
  51: { tipo: "ACARICIDA", organismos: [["ACARO","ARAÑUELA"]] },
  52: { tipo: "ACARICIDA", organismos: [["ACARO","ARAÑUELA"]] },
  53: { tipo: "ACARICIDA", organismos: [["ACARO","ARAÑUELA"]] },
  54: { tipo: "ACARICIDA", organismos: [["ACARO","ARAÑUELA"]] },
  55: { matchExisting: "PROPARGITE", movilidad: "CONTACTO", organismos: [["ACARO","ARAÑUELA"]] },
  56: { matchExisting: "ISOCYCLOSERAM", cultivos: ["TOMATE"], organismos: [["ACARO","ARAÑUELA"],["PLAGA","TUTA"]] },
  57: { tipo: "NEMATICIDA", cultivos: ["TOMATE"], organismos: [["NEMATODO","NEMATODOS"]] },
  58: { skipStandalone: true, appendTo: [36, 31] },
  59: { tipo: "NEMATICIDA", movilidad: "CONTACTO", organismos: [["NEMATODO","NEMATODOS"]] },
  60: { matchExisting: "METALAXIL", movilidad: "SISTEMICO", cultivos: ["AJO","CEBOLLA","PAPA"], organismos: [["ENFERMEDAD","PERONOSPORA"]] },
  61: { tipo: "FUNGICIDA", grupoAccion: "4", cultivos: ["TOMATE","PIMIENTO","PAPA"], organismos: [["ENFERMEDAD","PERONOSPORA"],["ENFERMEDAD","PHYTOPHTHORA"]] },
  62: { matchExisting: "CARBENDAZIM", grupoAccion: "1", cultivos: ["AJO","CEBOLLA","LECHUGA","ZAPALLO"], organismos: [["ENFERMEDAD","SCLEROTIUM"],["ENFERMEDAD","OIDIO"]] },
  63: { tipo: "FUNGICIDA", grupoAccion: "1", cultivos: ["AJO","PAPA"], organismos: [["ENFERMEDAD","SCLEROTIUM"],["ENFERMEDAD","RHIZOCTONIA"]] },
  64: { matchExisting: "METIL TIOFANATO", organismos: [["ENFERMEDAD","PODREDUMBRE"],["ENFERMEDAD","OIDIO"]] },
  65: { tipo: "FUNGICIDA", movilidad: "TRANSLAMINAR", organismos: [["ENFERMEDAD","OIDIO"]] },
  66: { tipo: "FUNGICIDA", grupoAccion: "7", movilidad: "TRANSLAMINAR", cultivos: ["TOMATE","PIMIENTO","ZAPALLO"], organismos: [["ENFERMEDAD","OIDIO"]] },
  67: { tipo: "FUNGICIDA", grupoAccion: "7", cultivos: ["AJO"], organismos: [["ENFERMEDAD","FUSARIUM"]] },
  68: { tipo: "FUNGICIDA", grupoAccion: "7", movilidad: "SISTEMICO", cultivos: ["PAPA","TOMATE","PIMIENTO"], organismos: [["ENFERMEDAD","OIDIO"],["ENFERMEDAD","ALTERNARIA"]] },
  69: { matchExisting: "AZOXISTROBINA", movilidad: "SISTEMICO", cultivos: ["ZANAHORIA","PAPA","TOMATE","PIMIENTO","ZAPALLO","LECHUGA","CEBOLLA","AJO"], organismos: [["ENFERMEDAD","ALTERNARIA"],["ENFERMEDAD","OIDIO"],["ENFERMEDAD","PHYTOPHTHORA"],["ENFERMEDAD","PERONOSPORA"],["ENFERMEDAD","STEMPHYLIUM"],["ENFERMEDAD","ROYA"]] },
  70: { tipo: "FUNGICIDA", grupoAccion: "11", movilidad: "TRANSLAMINAR", organismos: [["ENFERMEDAD","OIDIO"]] },
  71: { tipo: "FUNGICIDA", grupoAccion: "11", movilidad: "TRANSLAMINAR", cultivos: ["PAPA","AJO"], organismos: [["ENFERMEDAD","OIDIO"],["ENFERMEDAD","ALTERNARIA"],["ENFERMEDAD","ROYA"]] },
  72: { tipo: "FUNGICIDA", grupoAccion: "11", movilidad: "CONTACTO", cultivos: ["PAPA","TOMATE","PIMIENTO"], organismos: [["ENFERMEDAD","OIDIO"],["ENFERMEDAD","ALTERNARIA"]] },
  73: { tipo: "FUNGICIDA", grupoAccion: "29", movilidad: "CONTACTO", cultivos: ["PAPA"], organismos: [["ENFERMEDAD","PHYTOPHTHORA"],["ENFERMEDAD","PODREDUMBRE"]] },
  74: { tipo: "FUNGICIDA", grupoAccion: "29", movilidad: "TRANSLAMINAR", organismos: [["ENFERMEDAD","OIDIO"],["ACARO","ARAÑUELA"]] },
  75: { tipo: "FUNGICIDA", grupoAccion: "45", movilidad: "CONTACTO", cultivos: ["PAPA"], organismos: [["ENFERMEDAD","PHYTOPHTHORA"],["ENFERMEDAD","PERONOSPORA"]] },
  76: { tipo: "FUNGICIDA", grupoAccion: "9", movilidad: "SISTEMICO", cultivos: ["TOMATE"], organismos: [["ENFERMEDAD","PODREDUMBRE"]] },
  77: { tipo: "FUNGICIDA", grupoAccion: "24", cultivos: ["AJO","CEBOLLA","PIMIENTO","PAPA","TOMATE"], organismos: [["ENFERMEDAD","ALTERNARIA"]] },
  78: { tipo: "BACTERICIDA", grupoAccion: "25", cultivos: ["TOMATE","PIMIENTO"] },
  79: { tipo: "BACTERICIDA", nombreOverride: "OXITETRACICLINA + ESTREPTOMICINA", cultivos: ["TOMATE"] },
  80: { tipo: "BACTERICIDA", cultivos: ["TOMATE"] },
  81: { tipo: "FUNGICIDA", grupoAccion: "13", organismos: [["ENFERMEDAD","OIDIO"]] },
  82: { tipo: "FUNGICIDA", grupoAccion: "2", organismos: [["ENFERMEDAD","PODREDUMBRE"],["ENFERMEDAD","SCLEROTINIA"],["ENFERMEDAD","RHIZOCTONIA"],["ENFERMEDAD","ALTERNARIA"]] },
  83: { tipo: "FUNGICIDA", grupoAccion: "2", movilidad: "SISTEMICO", cultivos: ["AJO","LECHUGA"], organismos: [["ENFERMEDAD","PODREDUMBRE"],["ENFERMEDAD","SCLEROTINIA"]] },
  84: { tipo: "FUNGICIDA", grupoAccion: "12", movilidad: "CONTACTO", cultivos: ["PAPA"], organismos: [["ENFERMEDAD","RHIZOCTONIA"],["ENFERMEDAD","FUSARIUM"]] },
  85: { matchExisting: "CLORHIDRATO DE PROPAMOCARB", movilidad: "SISTEMICO", cultivos: ["PAPA"], organismos: [["ENFERMEDAD","PHYTIUM"],["ENFERMEDAD","PERONOSPORA"],["ENFERMEDAD","PHYTOPHTHORA"]] },
  86: { tipo: "FUNGICIDA", movilidad: "CONTACTO", organismos: [["ENFERMEDAD","PODREDUMBRE"],["ENFERMEDAD","OIDIO"]] },
  87: { tipo: "FUNGICIDA", organismos: [["ENFERMEDAD","OIDIO"],["ENFERMEDAD","PODREDUMBRE"]] },
  88: { tipo: "FUNGICIDA", grupoAccion: "3", movilidad: "SISTEMICO", cultivos: ["ZAPALLO"], organismos: [["ENFERMEDAD","OIDIO"]] },
  89: { tipo: "FUNGICIDA", grupoAccion: "3", movilidad: "SISTEMICO", organismos: [["ENFERMEDAD","OIDIO"]] },
  90: { tipo: "FUNGICIDA", grupoAccion: "3", cultivos: ["ZAPALLO"], organismos: [["ENFERMEDAD","OIDIO"]] },
  91: { matchExisting: "MICLOBUTANIL", movilidad: "SISTEMICO", cultivos: ["ZAPALLO"], organismos: [["ENFERMEDAD","OIDIO"],["ENFERMEDAD","SCLEROTINIA"],["ENFERMEDAD","RHIZOCTONIA"],["ENFERMEDAD","ROYA"]] },
  92: { matchExisting: "TEBUCONAZOLE", cultivos: ["AJO"], organismos: [["ENFERMEDAD","OIDIO"],["ENFERMEDAD","ROYA"],["ENFERMEDAD","STEMPHYLIUM"]] },
  93: { tipo: "FUNGICIDA", grupoAccion: "3", movilidad: "SISTEMICO", organismos: [["ENFERMEDAD","OIDIO"]] },
  94: { tipo: "FUNGICIDA", grupoAccion: "3", cultivos: ["PAPA","TOMATE"], organismos: [["ENFERMEDAD","ALTERNARIA"]] },
  95: { tipo: "FUNGICIDA", grupoAccion: "3", cultivos: ["AJO"], organismos: [["ENFERMEDAD","FUSARIUM"]] },
  96: { tipo: "FUNGICIDA", grupoAccion: "3", organismos: [["ENFERMEDAD","PODREDUMBRE"]] },
  97: { tipo: "FUNGICIDA", grupoAccion: "3", cultivos: ["ZAPALLO"], organismos: [["ENFERMEDAD","OIDIO"]] },
  98: { tipo: "FUNGICIDA", movilidad: "SISTEMICO", cultivos: ["ZAPALLO"], organismos: [["ENFERMEDAD","OIDIO"],["ENFERMEDAD","ROYA"]] },
  99: { tipo: "FUNGICIDA", grupoAccion: "17", movilidad: "CONTACTO", organismos: [["ENFERMEDAD","PODREDUMBRE"]] },
  100:{ tipo: "FUNGICIDA", grupoAccion: "40", movilidad: "TRANSLAMINAR", organismos: [["ENFERMEDAD","PERONOSPORA"],["ENFERMEDAD","PHYTOPHTHORA"]] },
  101:{ tipo: "FUNGICIDA", grupoAccion: "40", movilidad: "SISTEMICO", cultivos: ["PAPA"], organismos: [["ENFERMEDAD","PERONOSPORA"],["ENFERMEDAD","PHYTOPHTHORA"]] },
  102:{ tipo: "FUNGICIDA", grupoAccion: "P07", movilidad: "SISTEMICO", cultivos: ["PIMIENTO"], organismos: [["ENFERMEDAD","PERONOSPORA"],["ENFERMEDAD","PHYTOPHTHORA"]] },
  103:{ tipo: "FUNGICIDA", organismos: [["ENFERMEDAD","PERONOSPORA"]] },
  104:{ tipo: "FUNGICIDA", movilidad: "SISTEMICO", cultivos: ["PAPA"] },
  105:{ tipo: "FUNGICIDA", grupoAccion: "M02", movilidad: "CONTACTO", organismos: [["ENFERMEDAD","OIDIO"],["ACARO","ARAÑUELA"]] },
  106:{ tipo: "INSECTICIDA", movilidad: "CONTACTO", organismos: [["PLAGA","COCHINILLA"],["ENFERMEDAD","OIDIO"]] },
  107:{ tipo: "FUNGICIDA", grupoAccion: "M01", movilidad: "CONTACTO" },
  108:{ tipo: "FUNGICIDA", grupoAccion: "M01", movilidad: "CONTACTO", organismos: [["ENFERMEDAD","ANTRACNOSIS"],["ENFERMEDAD","PERONOSPORA"]] },
  109:{ tipo: "FUNGICIDA", grupoAccion: "M09", movilidad: "CONTACTO", organismos: [["ENFERMEDAD","ANTRACNOSIS"]] },
  110:{ tipo: "FUNGICIDA", grupoAccion: "M04", movilidad: "CONTACTO", cultivos: ["AJO"], organismos: [["ENFERMEDAD","PERONOSPORA"],["ENFERMEDAD","ANTRACNOSIS"]] },
  111:{ tipo: "FUNGICIDA", grupoAccion: "M04", movilidad: "CONTACTO", organismos: [["ENFERMEDAD","PERONOSPORA"],["ENFERMEDAD","OIDIO"],["ENFERMEDAD","PODREDUMBRE"]] },
  112:{ matchExisting: "ZINEB", movilidad: "CONTACTO", cultivos: ["AJO","CEBOLLA"], organismos: [["ENFERMEDAD","PERONOSPORA"],["ENFERMEDAD","ROYA"]] },
  113:{ tipo: "FUNGICIDA", movilidad: "CONTACTO", cultivos: ["AJO","CEBOLLA"], organismos: [["ENFERMEDAD","ROYA"]] },
  114:{ tipo: "FUNGICIDA", organismos: [["ENFERMEDAD","PERONOSPORA"]] },
  115:{ tipo: "FUNGICIDA", movilidad: "CONTACTO", cultivos: ["AJO","CEBOLLA","PEREJIL"], organismos: [["ENFERMEDAD","PERONOSPORA"],["ENFERMEDAD","OIDIO"],["ENFERMEDAD","ALTERNARIA"],["ENFERMEDAD","PHYTOPHTHORA"],["ENFERMEDAD","PODREDUMBRE"]] },
  116:{ tipo: "FUNGICIDA" },
  117:{ skipStandalone: true, appendTo: [67, 118] },
  118:{ tipo: "FUNGICIDA", cultivos: ["AJO"] },
};

const OBS_PREFIX =
  "Dato técnico proveniente de apuntes de estudio (\"Biblia Tera\" – Enzo Celentano; \"Resumen Terapéutica\") — verificar etiqueta y registro vigente en SENASA antes de usar. No implica registro en Argentina.\n\n";

function buildObservaciones(num: number): string {
  const block = blockByNum.get(num)!;
  const ov = OV[num];
  let text = block.text.trim();
  const appendedFrom = blocks.filter((b) => OV[b.num]?.appendTo?.includes(num));
  for (const extra of appendedFrom) {
    text += `\n\nMezcla mencionada en la fuente (ficha "${extra.nombre}"):\n${extra.text.trim()}`;
  }
  return (ov?.extraPrefix ?? "") + OBS_PREFIX + text;
}

function extraerFuente(text: string): string | null {
  const m = text.match(/Fuente:\s*(.+)$/m);
  return m ? m[1].trim() : null;
}

async function main() {
  const cultivosCanonicos = ["AJO","CEBOLLA","LECHUGA","MAIZ","PAPA","PEREJIL","PIMIENTO","PUERRO","REPOLLO","TOMATE","ZANAHORIA","ZAPALLO"];
  const cultivoRows = await prisma.cultivo.findMany({ where: { nombre: { in: cultivosCanonicos } } });
  const cultivoIdByNombre = new Map(cultivoRows.map((c) => [c.nombre, c.id]));

  const organismoRows = await prisma.organismo.findMany();
  const organismoIdByKey = new Map(organismoRows.map((o) => [`${o.tipo}:${o.nombre}`, o.id]));

  let creates = 0;
  let updates = 0;
  const dryRun: string[] = [];

  for (const block of blocks) {
    const ov = OV[block.num];
    if (!ov || ov.skipStandalone) continue;

    const cultivoIds = (ov.cultivos ?? [])
      .map((n) => cultivoIdByNombre.get(n))
      .filter((id): id is number => !!id)
      .map((id) => ({ id }));
    const organismoIds = (ov.organismos ?? [])
      .map(([tipo, nombre]) => organismoIdByKey.get(`${tipo}:${nombre}`))
      .filter((id): id is number => !!id)
      .map((id) => ({ id }));

    if (ov.matchExisting) {
      const existing = await prisma.principioActivo.findUnique({ where: { nombre: ov.matchExisting } });
      if (!existing) {
        console.warn(`AVISO: no se encontró "${ov.matchExisting}" (ficha #${block.num}) — se omite.`);
        continue;
      }
      const data: any = {};
      if (existing.grupoAccion === null && ov.grupoAccion) data.grupoAccion = ov.grupoAccion;
      if (existing.movilidad === null && ov.movilidad) data.movilidad = ov.movilidad;
      if (existing.observaciones === null) data.observaciones = buildObservaciones(block.num);
      if (existing.riesgoResistencia === null && ov.riesgoResistencia) data.riesgoResistencia = ov.riesgoResistencia;
      if (existing.fuenteInformacion === null) {
        const f = extraerFuente(block.text);
        if (f) data.fuenteInformacion = f;
      }
      if (cultivoIds.length) data.cultivos = { connect: cultivoIds };
      if (organismoIds.length) data.organismos = { connect: organismoIds };

      dryRun.push(`UPDATE ${ov.matchExisting} (ficha #${block.num}) -> campos: ${Object.keys(data).join(", ") || "(nada nuevo)"}`);
      if (Object.keys(data).length) {
        await prisma.principioActivo.update({ where: { id: existing.id }, data });
        updates++;
      }
    } else {
      const nombre = ov.nombreOverride ?? block.nombre;
      const existing = await prisma.principioActivo.findUnique({ where: { nombre } });
      if (existing) {
        dryRun.push(`SKIP (ya existe) ${nombre} (ficha #${block.num})`);
        continue;
      }
      const fuente = extraerFuente(block.text);
      const data: any = {
        nombre,
        tipo: ov.tipo ?? "OTRO",
        grupoAccion: ov.grupoAccion ?? null,
        movilidad: ov.movilidad ?? null,
        observaciones: buildObservaciones(block.num),
        riesgoResistencia: ov.riesgoResistencia ?? null,
        fuenteInformacion: fuente,
      };
      if (cultivoIds.length) data.cultivos = { connect: cultivoIds };
      if (organismoIds.length) data.organismos = { connect: organismoIds };

      dryRun.push(`CREATE ${nombre} (ficha #${block.num}) tipo=${data.tipo} grupo=${data.grupoAccion}`);
      await prisma.principioActivo.create({ data });
      creates++;
    }
  }

  console.log(dryRun.join("\n"));
  console.log(`\nTOTAL: ${creates} creados, ${updates} actualizados.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
