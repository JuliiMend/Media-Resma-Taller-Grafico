import { Router } from "express";
import { tareaController } from "../controllers/tarea.controller";

export const tareaRouter = Router();

tareaRouter.get("/", tareaController.listar);
tareaRouter.get("/:id", tareaController.obtener);
tareaRouter.post("/", tareaController.crear);
tareaRouter.patch("/:id", tareaController.actualizar);
tareaRouter.delete("/:id", tareaController.eliminar);
