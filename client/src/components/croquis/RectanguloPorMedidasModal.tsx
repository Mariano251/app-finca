import { useState } from "react";
import { Modal } from "../Modal";

export function RectanguloPorMedidasModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: (anchoM: number, altoM: number) => void;
}) {
  const [ancho, setAncho] = useState("");
  const [alto, setAlto] = useState("");
  const a = Number(ancho);
  const h = Number(alto);
  const valido = ancho !== "" && alto !== "" && !Number.isNaN(a) && !Number.isNaN(h) && a > 0 && h > 0;

  return (
    <Modal title="Rectángulo por medidas" onClose={onClose}>
      <p className="text-muted" style={{ fontSize: "0.85rem" }}>
        Ingresá el ancho y el alto reales de la parcela. Después vas a tocar el croquis para
        marcar la esquina donde se ancla.
      </p>
      <div className="field">
        <label>Ancho (metros)</label>
        <input type="number" min="0" step="0.1" value={ancho} onChange={(e) => setAncho(e.target.value)} autoFocus />
      </div>
      <div className="field">
        <label>Alto (metros)</label>
        <input type="number" min="0" step="0.1" value={alto} onChange={(e) => setAlto(e.target.value)} />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
        <button className="btn secondary" onClick={onClose} type="button">
          Cancelar
        </button>
        <button className="btn" type="button" disabled={!valido} onClick={() => onConfirm(a, h)}>
          Continuar → tocar croquis
        </button>
      </div>
    </Modal>
  );
}
