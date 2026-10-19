import { Request, Response } from "express";
import { createCrudController } from "./crud.controller";
import { pedidoService } from "../../services/pedido.service";
import {
  crearPedidoSchema,
  actualizarPedidoSchema,
  pagoPedidoSchema,
} from "../../schemas/pedido.schema";
import { asyncHandler } from "../../utils/asyncHandler";

const crud = createCrudController(
  pedidoService,
  crearPedidoSchema,
  actualizarPedidoSchema
);

export const pedidoController = {
  ...crud,
  pagar: asyncHandler(async (req: Request, res: Response) => {
    const { monto } = pagoPedidoSchema.parse(req.body ?? {});
    const pedido = await pedidoService.pagar(Number(req.params.id), monto);
    res.json(pedido);
  }),
};
