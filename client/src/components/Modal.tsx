import type { ReactNode } from "react";

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="page-header">
          <h3>{title}</h3>
          <button className="btn secondary small" onClick={onClose} type="button">
            Cerrar
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
