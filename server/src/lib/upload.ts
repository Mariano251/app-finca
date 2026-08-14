import multer from "multer";

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Solo se permiten imágenes"));
      return;
    }
    cb(null, true);
  },
});

/** Para adjuntos de la Biblioteca (etiqueta/ficha técnica de un producto): además de imágenes,
 * acepta PDF. Instancia separada de `upload` para no aflojar el filtro de las fotos de campo. */
export const uploadDoc = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/") && file.mimetype !== "application/pdf") {
      cb(new Error("Solo se permiten imágenes o PDF"));
      return;
    }
    cb(null, true);
  },
});
