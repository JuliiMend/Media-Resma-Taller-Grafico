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
  listar: asyncHandler(async (req: Request, res: Response) => {
    const productoRaw = Number(req.query.productoId);
    const productoId =
      req.query.productoId !== undefined && Number.isInteger(productoRaw) && productoRaw > 0
        ? productoRaw
        : undefined;

    if (req.query.page === undefined) {
      res.json(await pedidoService.listar(productoId));
      return;
    }

    const page = Math.max(1, Math.trunc(Number(req.query.page)) || 1);
    const requestedSize = Math.trunc(Number(req.query.pageSize)) || 25;
    const pageSize = Math.min(100, Math.max(1, requestedSize));
    res.json(await pedidoService.listarPaginado(page, pageSize, productoId));
  }),
  pagar: asyncHandler(async (req: Request, res: Response) => {
    const { monto } = pagoPedidoSchema.parse(req.body ?? {});
    const pedido = await pedidoService.pagar(Number(req.params.id), monto);
    res.json(pedido);
  }),
};
