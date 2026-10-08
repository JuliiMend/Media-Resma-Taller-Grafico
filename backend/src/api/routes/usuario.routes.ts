import { Router } from "express";
import { usuarioController } from "../controllers/usuario.controller";

export const usuarioRouter = Router();

usuarioRouter.get("/", usuarioController.listar);
usuarioRouter.get("/:id", usuarioController.obtener);
usuarioRouter.post("/", usuarioController.crear);
usuarioRouter.patch("/:id", usuarioController.actualizar);
usuarioRouter.delete("/:id", usuarioController.eliminar);
