import express from "express";
import cors from "cors";
import { ZodError } from "zod";
import { apiRouter } from "./api";

export const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api", apiRouter);

// Manejo de errores centralizado: acá llegan tanto los errores
// de validación de Zod como cualquier throw dentro de un service.
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: "Datos inválidos", detalles: err.issues });
    }
    console.error(err);
    const mensaje = err instanceof Error ? err.message : "Error interno";
    res.status(500).json({ error: mensaje });
  }
);
