import { Request, Response } from "express";
import { createCrudController } from "./crud.controller";
import { trabajoService } from "../../services/trabajo.service";
import { crearTrabajoSchema, actualizarTrabajoSchema } from "../../schemas/trabajo.schema";
import { asyncHandler } from "../../utils/asyncHandler";

export const trabajoController = {
  ...createCrudController(trabajoService, crearTrabajoSchema, actualizarTrabajoSchema),
  sugerencias: asyncHandler(async (req: Request, res: Response) => {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (q.length < 2) {
      res.json([]);
      return;
    }
    res.json(await trabajoService.sugerencias(q));
  }),
};
