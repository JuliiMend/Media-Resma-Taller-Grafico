import { Router } from "express";
import { pedidoController } from "../controllers/pedido.controller";

export const pedidoRouter = Router();

pedidoRouter.get("/", pedidoController.listar);
pedidoRouter.get("/:id", pedidoController.obtener);
pedidoRouter.post("/", pedidoController.crear);
pedidoRouter.patch("/:id", pedidoController.actualizar);
pedidoRouter.delete("/:id", pedidoController.eliminar);
