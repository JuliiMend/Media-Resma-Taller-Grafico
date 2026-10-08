import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { alertaService } from "../../services/alerta.service";

export const chequearAlertas = asyncHandler(async (req: Request, res: Response) => {
  const resultado = await alertaService.chequear();
  res.json({ ok: true, resultado });
});