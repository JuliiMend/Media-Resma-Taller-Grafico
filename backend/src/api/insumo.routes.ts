import { Router } from "express";
import { insumoService } from "../services/insumo.service";
import { crearInsumoSchema, actualizarInsumoSchema } from "../schemas/insumo.schema";
import { asyncHandler } from "../utils/asyncHandler";

export const insumoRouter = Router();

// GET /api/insumos
insumoRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const insumos = await insumoService.listar();
    res.json(insumos);
  })
);

// GET /api/insumos/stock-bajo
insumoRouter.get(
  "/stock-bajo",
  asyncHandler(async (_req, res) => {
    const insumos = await insumoService.listarConStockBajo();
    res.json(insumos);
  })
);

// GET /api/insumos/:id
insumoRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const insumo = await insumoService.obtener(Number(req.params.id));
    res.json(insumo);
  })
);

// POST /api/insumos
insumoRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = crearInsumoSchema.parse(req.body);
    const insumo = await insumoService.crear(data);
    res.status(201).json(insumo);
  })
);

// PATCH /api/insumos/:id
insumoRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = actualizarInsumoSchema.parse(req.body);
    const insumo = await insumoService.actualizar(Number(req.params.id), data);
    res.json(insumo);
  })
);

// DELETE /api/insumos/:id
insumoRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await insumoService.eliminar(Number(req.params.id));
    res.status(204).send();
  })
);
