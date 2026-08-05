import type { FieldSchema } from "../../components/RecordForm";
import type { Cultivo, Variedad } from "../../api/types";
import { ESTADO_CAMPANA_OPTIONS } from "../../constants";

export function buildCampanaFields(cultivos: Cultivo[], variedades: Variedad[]): FieldSchema[] {
  return [
    { name: "nombre", label: "Nombre de la campaña", type: "text", required: true, placeholder: "Ajo 2026" },
    {
      name: "cultivoId",
      label: "Cultivo",
      type: "select",
      required: true,
      options: cultivos.map((c) => ({ value: String(c.id), label: c.nombre })),
    },
    {
      name: "variedadId",
      label: "Variedad",
      type: "select",
      options: variedades.map((v) => ({
        value: String(v.id),
        label: `${v.cultivo?.nombre ? v.cultivo.nombre + " — " : ""}${v.nombre}`,
      })),
    },
    { name: "estado", label: "Estado", type: "select", options: ESTADO_CAMPANA_OPTIONS },
    { name: "fechaPlantacion", label: "Fecha de plantación", type: "date" },
    { name: "fechaCosechaEstimada", label: "Fecha estimada de cosecha", type: "date" },
    { name: "fechaCosechaReal", label: "Fecha real de cosecha", type: "date" },
    { name: "superficieImplantada", label: "Superficie implantada (ha)", type: "number", step: "0.01" },
    { name: "notas", label: "Notas", type: "textarea", fullWidth: true },
  ];
}
