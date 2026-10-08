import { NextFunction, Request, Response } from "express";
import { HttpError } from "../../utils/http-error";

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err.code === "P2025") {
    return res.status(404).json({ error: "Registro no encontrado" });
  }
  if (err.code === "P2002") {
    return res.status(409).json({ error: "Ya existe un registro con ese valor único" });
  }
  if (err.code === "P2003") {
    return res
      .status(409)
      .json({ error: "No se puede completar la operación: tiene registros relacionados" });
  }

  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }

  console.error(err);
  res.status(500).json({ error: "Error interno del servidor" });
}
