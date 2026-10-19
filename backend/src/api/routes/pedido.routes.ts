import { Router } from "express";
import { pedidoController } from "../controllers/pedido.controller";
import { validate } from "../middlewares/validate.middleware";
import { pagoPedidoSchema } from "../../schemas/pedido.schema";

export const pedidoRouter = Router();

pedidoRouter.get("/", pedidoController.listar);
pedidoRouter.get("/:id", pedidoController.obtener);
pedidoRouter.post("/", pedidoController.crear);
pedidoRouter.post("/:id/pagos", validate(pagoPedidoSchema), pedidoController.pagar);
pedidoRouter.patch("/:id", pedidoController.actualizar);
pedidoRouter.delete("/:id", pedidoController.eliminar);
