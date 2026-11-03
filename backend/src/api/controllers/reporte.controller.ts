import { Request, Response } from "express";
import { z, type ZodTypeAny } from "zod";
import { asyncHandler } from "../../utils/asyncHandler";
import { reporteService } from "../../services/reporte.service";
import {
  balanceQuerySchema,
  rankingQuerySchema,
  resumenQuerySchema,
  ventasQuerySchema,
} from "../../schemas/reporte.schema";

function parsear<T extends ZodTypeAny>(
  schema: T,
  req: Request,
  res: Response,
): z.infer<T> | null {
  const resultado = schema.safeParse(req.query);
  if (!resultado.success) {
    res.status(400).json({
      error: "Parámetros inválidos",
      detalles: resultado.error.flatten(),
    });
    return null;
  }
  return resultado.data as z.infer<T>;
}

export const reporteController = {
  ventas: asyncHandler(async (req: Request, res: Response) => {
    const query = parsear(ventasQuerySchema, req, res);
    if (!query) return;
    res.json(await reporteService.ventas(query));
  }),

  resumen: asyncHandler(async (req: Request, res: Response) => {
    const query = parsear(resumenQuerySchema, req, res);
    if (!query) return;
    res.json(await reporteService.resumen(query));
  }),

  ranking: asyncHandler(async (req: Request, res: Response) => {
    const query = parsear(rankingQuerySchema, req, res);
    if (!query) return;
    res.json(await reporteService.ranking(query));
  }),

  balance: asyncHandler(async (req: Request, res: Response) => {
    const query = parsear(balanceQuerySchema, req, res);
    if (!query) return;
    res.json(await reporteService.balance(query));
  }),
};
