import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { useDelete, useList } from "../api/useCrud";
import type { Imagen, TipoEntidadImagen } from "../api/types";
import { resolveImageUrl } from "../constants";

export function ImageAttachments({
  entityType,
  entityId,
}: {
  entityType: TipoEntidadImagen;
  entityId: number;
}) {
  const { data: imagenes } = useList<Imagen>("/imagenes", { entityType, entityId });
  const qc = useQueryClient();

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      form.append("entityType", entityType);
      form.append("entityId", String(entityId));
      return (await api.post("/imagenes", form)).data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/imagenes"] }),
  });

  const del = useDelete("/imagenes", ["/imagenes"]);

  return (
    <div>
      {(imagenes?.length ?? 0) > 0 && (
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
          {imagenes!.map((img) => (
            <div key={img.id} style={{ position: "relative" }}>
              <img
                src={resolveImageUrl(img.path)}
                alt={img.descripcion ?? ""}
                style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 8 }}
              />
              <button
                type="button"
                className="btn danger small"
                style={{ position: "absolute", top: 2, right: 2, padding: "0 6px", lineHeight: "1.4rem" }}
                onClick={() => {
                  if (confirm("¿Borrar esta foto?")) del.mutate(img.id);
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <label className="btn secondary small" style={{ cursor: "pointer", display: "inline-block" }}>
        {upload.isPending ? "Subiendo…" : "+ Agregar foto"}
        <input
          type="file"
          accept="image/*"
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
