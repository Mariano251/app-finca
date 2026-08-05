import "dotenv/config";
import path from "path";
import fs from "fs";
import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import { apiRouter } from "./routes";

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.use("/api", apiRouter);

// In production, serve the built frontend from the same server/port.
const clientDist = path.join(__dirname, "..", "..", "client", "dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  res.status(400).json({ error: err?.message ?? "Error interno" });
};
app.use(errorHandler);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`API Finca escuchando en http://0.0.0.0:${PORT}`);
});
