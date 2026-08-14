import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { useDelete, useList } from "../../api/useCrud";
import type { Imagen, TipoEntidadImagen } from "../../api/types";
import { resolveImageUrl } from "../../constants";

/**
 * Adjuntos de etiqueta/ficha técnica (típicamente PDF) para un producto comercial. A diferencia
 * de `ImageAttachments` (fotos de campo), no tiene cola offline — adjuntar una ficha técnica no
 * es una captura crítica de campo, y muestra el archivo como link de descarga en vez de miniatura
 * porque un PDF no se puede previsualizar como `<img>`.
 */
export function DocumentAttachments({ entityType, entityId }: { entityType: TipoEntidadImagen; entityId: number }) {
  const { data: adjuntos } = useList<Imagen>("/imagenes", { entityType, entityId });
  const qc = useQueryClient();

  const upload = useMutation({
    mutationFn: async (file: File): Promise<Imagen> => {
      const form = new FormData();
      form.append("file", file);
      form.append("entityType", entityType);
      form.append("entityId", String(entityId));
      form.append("descripcion", file.name);
      return (await api.post("/adjuntos", form)).data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/imagenes"] }),
  });

  const del = useDelete("/imagenes", ["/imagenes"]);

  return (
    <div>
      {(adjuntos?.length ?? 0) > 0 && (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, marginBottom: "0.5rem" }}>
          {adjuntos!.map((a) => (
            <li key={a.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.3rem 0" }}>
              <a href={resolveImageUrl(a.path)} target="_blank" rel="noreferrer">
                📎 {a.descripcion || "Adjunto"}
              </a>
              <button
                type="button"
                className="btn danger small"
                onClick={() => {
                  if (confirm("¿Borrar este adjunto?")) del.mutate(a.id);
                }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <label className="btn secondary small" style={{ cursor: "pointer", display: "inline-block" }}>
        {upload.isPending ? "Subiendo…" : "+ Adjuntar etiqueta / ficha técnica"}
        <input
          type="file"
          accept="image/*,application/pdf"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload.mutate(file);
            e.target.value = "";
          }}
        />
      </label>
    </div>
  );
}
