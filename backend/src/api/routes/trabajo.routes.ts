import { Router } from "express";
import { trabajoController } from "../controllers/trabajo.controller";

export const trabajoRouter = Router();

trabajoRouter.get("/", trabajoController.listar);
trabajoRouter.get("/:id", trabajoController.obtener);
trabajoRouter.post("/", trabajoController.crear);
trabajoRouter.patch("/:id", trabajoController.actualizar);
trabajoRouter.delete("/:id", trabajoController.eliminar);
