import type { RegistroArgentina } from "../../api/types";
import { REGISTRO_ARGENTINA_OPTIONS } from "../../constants";

/**
 * Punto 11/12 del pedido: nunca mezclar visualmente info técnica general/internacional con uso
 * verificado en Argentina. Un solo componente para que ese color/ícono sea siempre el mismo en
 * toda la Biblioteca (fichas, listas, resultados de búsqueda).
 */
const ESTILO: Record<RegistroArgentina, { bg: string; color: string; icon: string }> = {
  VERIFICADO: { bg: "#e7f2e2", color: "#2c5a2c", icon: "✅" },
  NO_VERIFICADO: { bg: "#fdf3d8", color: "#8a6d1f", icon: "❔" },
  NO_REGISTRADO: { bg: "#fbe9e7", color: "#b3413a", icon: "🚫" },
  INTERNACIONAL: { bg: "#e4ecf7", color: "#2c4a7c", icon: "🌐" },
  PENDIENTE: { bg: "#eee", color: "#666", icon: "⏳" },
};

export function RegistroBadge({ value }: { value: RegistroArgentina }) {
  const estilo = ESTILO[value] ?? ESTILO.PENDIENTE;
  const label = REGISTRO_ARGENTINA_OPTIONS.find((o) => o.value === value)?.label ?? value;
  return (
    <span className="tag" style={{ background: estilo.bg, color: estilo.color }}>
      {estilo.icon} {label}
    </span>
  );
}
