import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { useDelete, useList } from "../api/useCrud";
import type { Imagen, TipoEntidadImagen } from "../api/types";
import { resolveImageUrl } from "../constants";
import { isConnectivityError } from "../offline/isConnectivityError";
import { enqueuePhotoCreate } from "../offline/queue";
import { applyOptimisticCreate } from "../offline/cachePatch";
import { scheduleSync } from "../offline/sync";

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
    mutationFn: async (file: File): Promise<Imagen> => {
      const form = new FormData();
      form.append("file", file);
      form.append("entityType", entityType);
      form.append("entityId", String(entityId));
      try {
        return (await api.post("/imagenes", form)).data;
      } catch (error) {
        if (!isConnectivityError(error)) throw error;
        // Sin conexión: se guarda el archivo tal cual en IndexedDB y se muestra desde un object
        // URL local hasta que se pueda subir de verdad al reconectar (ver offline/sync.ts).
        const { tempId } = await enqueuePhotoCreate(entityType, entityId, file, file.name);
        const objectUrl = URL.createObjectURL(file);
        return applyOptimisticCreate(qc, "/imagenes", tempId, { entityType, entityId }, { path: objectUrl }) as Imagen;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/imagenes"] });
      scheduleSync(qc);
    },
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
                  if (confirm("¿Borrar esta foto?")) {
                    if (img.path.startsWith("blob:")) URL.revokeObjectURL(img.path);
                    del.mutate(img.id);
                  }
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
