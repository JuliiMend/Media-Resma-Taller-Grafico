import { Request, Response } from "express";
import { insumoService } from "../../services/insumo.service";
import { crearInsumoSchema, actualizarInsumoSchema } from "../../schemas/insumo.schema";
import { asyncHandler } from "../../utils/asyncHandler";


export const listarInsumos = asyncHandler(async (_req: Request, res: Response) => {
  const insumos = await insumoService.listar();
  res.json(insumos);
});

export const listarStockBajo = asyncHandler(async (_req: Request, res: Response) => {
  const insumos = await insumoService.listarConStockBajo();
  res.json(insumos);
});

export const obtenerInsumo = asyncHandler(async (req: Request, res: Response) => {
  const insumo = await insumoService.obtener(Number(req.params.id));
  res.json(insumo);
});

export const crearInsumo = asyncHandler(async (req: Request, res: Response) => {
  const insumo = await insumoService.crear(crearInsumoSchema.parse(req.body));
  res.status(201).json(insumo);
});

export const actualizarInsumo = asyncHandler(async (req: Request, res: Response) => {
  const insumo = await insumoService.actualizar(
    Number(req.params.id),
    actualizarInsumoSchema.parse(req.body)
  );
  res.json(insumo);
});

export const eliminarInsumo = asyncHandler(async (req: Request, res: Response) => {
  await insumoService.eliminar(Number(req.params.id));
  res.status(204).send();
});
