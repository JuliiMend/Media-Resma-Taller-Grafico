import { Router } from "express";
import { compraController } from "../controllers/compra.controller";

export const compraRouter = Router();

compraRouter.get("/", compraController.listar);
compraRouter.get("/:id", compraController.obtener);
compraRouter.post("/", compraController.crear);
compraRouter.patch("/:id", compraController.actualizar);
compraRouter.delete("/:id", compraController.eliminar);
