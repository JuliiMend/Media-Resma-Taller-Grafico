import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { reporteService } from "../../services/reporte.service";
import { ventasQuerySchema } from "../../schemas/reporte.schema";

export const reporteController = {
  ventas: asyncHandler(async (req: Request, res: Response) => {
    const resultado = ventasQuerySchema.safeParse(req.query);

    if (!resultado.success) {
      return res.status(400).json({
        error: "Parámetros inválidos",
        detalles: resultado.error.flatten(),
      });
    }

    res.json(await reporteService.ventas(resultado.data));
  }),
};
