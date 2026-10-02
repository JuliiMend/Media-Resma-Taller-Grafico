import { Router } from "express";
import { movimientoStockController } from "../controllers/movimientoStock.controller";

export const movimientoStockRouter = Router();

movimientoStockRouter.get("/", movimientoStockController.listar);
movimientoStockRouter.get("/:id", movimientoStockController.obtener);
movimientoStockRouter.post("/", movimientoStockController.crear);
movimientoStockRouter.patch("/:id", movimientoStockController.actualizar);
movimientoStockRouter.delete("/:id", movimientoStockController.eliminar);
