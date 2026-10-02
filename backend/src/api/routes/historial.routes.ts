import { Router } from "express";
import { historialController } from "../controllers/historial.controller";

export const historialRouter = Router();

historialRouter.get("/", historialController.listar);
historialRouter.get("/:id", historialController.obtener);
historialRouter.post("/", historialController.crear);
historialRouter.patch("/:id", historialController.actualizar);
historialRouter.delete("/:id", historialController.eliminar);
