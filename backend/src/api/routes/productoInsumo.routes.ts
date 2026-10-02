import { Router } from "express";
import { productoInsumoController } from "../controllers/productoInsumo.controller";

export const productoInsumoRouter = Router();

productoInsumoRouter.get("/", productoInsumoController.listar);
productoInsumoRouter.get("/:id", productoInsumoController.obtener);
productoInsumoRouter.post("/", productoInsumoController.crear);
productoInsumoRouter.patch("/:id", productoInsumoController.actualizar);
productoInsumoRouter.delete("/:id", productoInsumoController.eliminar);
