import { Router } from "express";
import {
  listarInsumos,
  listarStockBajo,
  obtenerInsumo,
  crearInsumo,
  actualizarInsumo,
  eliminarInsumo,
} from "../controllers/insumo.controller";

export const insumoRouter = Router();

// GET /api/insumos
insumoRouter.get("/", listarInsumos);

// GET /api/insumos/stock-bajo
insumoRouter.get("/stock-bajo", listarStockBajo);

// GET /api/insumos/:id
insumoRouter.get("/:id", obtenerInsumo);

// POST /api/insumos
insumoRouter.post("/", crearInsumo);

// PATCH /api/insumos/:id
insumoRouter.patch("/:id", actualizarInsumo);

// DELETE /api/insumos/:id
insumoRouter.delete("/:id", eliminarInsumo);
