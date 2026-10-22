import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { createCrudController } from "./crud.controller";
import { historialService } from "../../services/historial.service";
import {
  actualizarHistorialSchema,
  crearHistorialSchema,
  filtrosHistorialSchema,
} from "../../schemas/historial.schema";

export const historialController = {
  ...createCrudController(historialService, crearHistorialSchema, actualizarHistorialSchema),
  listar: asyncHandler(async (req: Request, res: Response) => {
    res.json(await historialService.listar(filtrosHistorialSchema.parse(req.query)));
  }),
};
