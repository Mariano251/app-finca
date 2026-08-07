import { useState } from "react";
import { Modal } from "../Modal";

export function CalibrateScaleModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: (distanciaM: number) => void;
}) {
  const [distancia, setDistancia] = useState("");
  const valor = Number(distancia);
  const valido = distancia !== "" && !Number.isNaN(valor) && valor > 0;

  return (
    <Modal title="Calibrar escala" onClose={onClose}>
      <p className="text-muted" style={{ fontSize: "0.85rem" }}>
        Marcaste una distancia sobre el croquis. Ingresá cuántos metros representa esa cota en la
        realidad (por ejemplo, la medida de un lado del lote que ya conocés).
      </p>
      <div className="field">
        <label>Distancia real (metros)</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={distancia}
          onChange={(e) => setDistancia(e.target.value)}
          autoFocus
        />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
        <button className="btn secondary" onClick={onClose} type="button">
          Cancelar
        </button>
        <button className="btn" type="button" disabled={!valido} onClick={() => onConfirm(valor)}>
          Guardar escala
        </button>
      </div>
    </Modal>
  );
}
