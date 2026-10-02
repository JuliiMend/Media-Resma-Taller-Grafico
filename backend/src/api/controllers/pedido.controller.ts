import { createCrudController } from "./crud.controller";
import { pedidoService } from "../../services/pedido.service";
import { crearPedidoSchema, actualizarPedidoSchema } from "../../schemas/pedido.schema";

export const pedidoController = createCrudController(pedidoService, crearPedidoSchema, actualizarPedidoSchema);
