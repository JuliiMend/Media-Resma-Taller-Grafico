import { Router } from "express";
import { clienteController } from "../controllers/cliente.controller";

export const clienteRouter = Router();

clienteRouter.get("/", clienteController.listar);
clienteRouter.get("/:id", clienteController.obtener);
clienteRouter.post("/", clienteController.crear);
clienteRouter.patch("/:id", clienteController.actualizar);
clienteRouter.delete("/:id", clienteController.eliminar);
