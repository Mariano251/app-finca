import { useState } from "react";
import { Link } from "react-router-dom";
import type { Cuadro } from "../../api/types";
import { Modal } from "../Modal";
import { colorForCultivo } from "../../constants";

export function AssignCuadroModal({
  cuadros,
  initialCuadroId,
  initialColor,
  onClose,
  onConfirm,
}: {
  cuadros: Cuadro[];
  initialCuadroId?: number | null;
  initialColor?: string;
  onClose: () => void;
  onConfirm: (cuadroId: number | null, color: string) => void;
}) {
  const [cuadroId, setCuadroId] = useState<string>(initialCuadroId ? String(initialCuadroId) : "");
  const [color, setColor] = useState(initialColor ?? "#4a7c2c");

  function handleCuadroChange(value: string) {
    setCuadroId(value);
    const c = cuadros.find((c) => c.id === Number(value));
    const activeCultivo = c?.campanas?.find((camp) => camp.estado === "ACTIVA")?.cultivo?.nombre;
    if (activeCultivo) setColor(colorForCultivo(activeCultivo));
  }

  return (
    <Modal title="Asignar cuadro" onClose={onClose}>
      <div className="field">
        <label>Cuadro</label>
        <select value={cuadroId} onChange={(e) => handleCuadroChange(e.target.value)}>
          <option value="">— sin asignar —</option>
          {cuadros.map((c) => (
            <option key={c.id} value={c.id}>
              {c.sector?.nombre ? `${c.sector.nombre} / ` : ""}
              {c.nombre}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Color</label>
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: 60 }} />
      </div>
      <p className="text-muted" style={{ fontSize: "0.8rem" }}>
        ¿El cuadro todavía no existe? <Link to="/finca">Creálo en Finca</Link> y volvé acá para
        asignarlo a la forma dibujada.
      </p>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
        <button className="btn secondary" onClick={onClose} type="button">
          Cancelar
        </button>
        <button
          className="btn"
          type="button"
          onClick={() => onConfirm(cuadroId ? Number(cuadroId) : null, color)}
        >
          Guardar
        </button>
      </div>
    </Modal>
  );
}
