import { Request, Response } from "express";
import { alertaService } from "../../services/alerta.service";
import { asyncHandler } from "../../utils/asyncHandler";

export const chequearAlertas = asyncHandler(async (_req: Request, res: Response) => {
  const resultado = await alertaService.chequear();
  res.json(resultado);
});
