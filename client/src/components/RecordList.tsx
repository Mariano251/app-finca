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
  emptyMessage = "No hay registros todavía.",
}: {
  items: T[] | undefined;
  columns: ColumnSchema<T>[];
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onRowClick?: (item: T) => void;
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
            {(onEdit || onDelete) && <th></th>}
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
              {(onEdit || onDelete) && (
                <td onClick={(e) => e.stopPropagation()}>
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
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
