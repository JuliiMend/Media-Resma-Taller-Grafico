import { Router } from "express";
import { gastoController } from "../controllers/gasto.controller";

export const gastoRouter = Router();

gastoRouter.get("/", gastoController.listar);
gastoRouter.get("/:id", gastoController.obtener);
gastoRouter.post("/", gastoController.crear);
gastoRouter.patch("/:id", gastoController.actualizar);
gastoRouter.delete("/:id", gastoController.eliminar);
