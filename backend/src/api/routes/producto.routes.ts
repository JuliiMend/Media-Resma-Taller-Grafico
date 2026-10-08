import { Router } from "express";
import { productoController } from "../controllers/producto.controller";

export const productoRouter = Router();

productoRouter.get("/", productoController.listar);
productoRouter.get("/:id", productoController.obtener);
productoRouter.post("/", productoController.crear);
productoRouter.patch("/:id", productoController.actualizar);
productoRouter.delete("/:id", productoController.eliminar);
