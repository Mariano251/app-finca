import type { ReactNode } from "react";

export interface ColumnSchema<T> {
  key: string;
  label: string;
  render?: (item: T) => ReactNode;
}

export function RecordList<T extends { id: number }>({
  items,
  columns,
  onEdit,
  onDelete,
  onRowClick,
  isReadOnly,
  extraActions,
  emptyMessage = "No hay registros todavía.",
}: {
  items: T[] | undefined;
  columns: ColumnSchema<T>[];
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onRowClick?: (item: T) => void;
  /** For rows where this returns true, hides Editar/Borrar and shows a read-only tag instead
   *  (ej: costos generados automáticamente desde un consumo de stock, que no deben duplicarse). */
  isReadOnly?: (item: T) => boolean;
  /** Extra per-row action button(s) rendered before Editar/Borrar (ej: "Copiar a otros cuadros"). */
  extraActions?: (item: T) => ReactNode;
  emptyMessage?: string;
}) {
  if (!items || items.length === 0) {
    return <div className="empty-state">{emptyMessage}</div>;
  }
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key}>{c.label}</th>
            ))}
            {(onEdit || onDelete || extraActions) && <th></th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              onClick={onRowClick ? () => onRowClick(item) : undefined}
              style={onRowClick ? { cursor: "pointer" } : undefined}
            >
              {columns.map((c) => (
                <td key={c.key}>
                  {c.render ? c.render(item) : String((item as Record<string, unknown>)[c.key] ?? "—")}
                </td>
              ))}
              {(onEdit || onDelete || extraActions) && (
                <td onClick={(e) => e.stopPropagation()}>
                  {isReadOnly?.(item) ? (
                    <span className="tag" title="Generado automáticamente a partir de un consumo de stock">
                      Automático
                    </span>
                  ) : (
                    <>
                      {extraActions?.(item)}
                      {onEdit && (
                        <button className="btn secondary small" onClick={() => onEdit(item)} type="button">
                          Editar
                        </button>
                      )}
                      {onDelete && (
                        <button
                          className="btn danger small"
                          style={{ marginLeft: "0.3rem" }}
                          onClick={() => onDelete(item)}
                          type="button"
                        >
                          Borrar
                        </button>
                      )}
                    </>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
