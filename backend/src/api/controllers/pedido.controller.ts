import { Request, Response } from "express";
import { createCrudController } from "./crud.controller";
import { pedidoService } from "../../services/pedido.service";
import {
  crearPedidoSchema,
  actualizarPedidoSchema,
  pagoPedidoSchema,
} from "../../schemas/pedido.schema";
import { asyncHandler } from "../../utils/asyncHandler";
import type { PedidoFiltros } from "../../repositories/pedido.repository";

const crud = createCrudController(
  pedidoService,
  crearPedidoSchema,
  actualizarPedidoSchema
);

const texto = (valor: unknown) =>
  typeof valor === "string" && valor.trim().length > 0 ? valor.trim() : undefined;

const numeroPositivo = (valor: unknown) => {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : undefined;
};

const fecha = (valor: unknown): Date | undefined => {
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return undefined;
  const fecha = new Date(`${valor}T00:00:00.000Z`);
  return Number.isNaN(fecha.getTime()) ? undefined : fecha;
};

const sumarDias = (fecha: Date, dias: number) =>
  new Date(fecha.getTime() + dias * 24 * 60 * 60 * 1000);

const parsearEstados = (valor: unknown): string[] | undefined => {
  if (typeof valor !== "string" || valor.length === 0 || valor === "TODOS") {
    return undefined;
  }
  if (valor === "NONE") return [];
  return valor
    .split(",")
    .map((estado) => estado.trim())
    .filter(Boolean);
};

const parsearFiltros = (req: Request): PedidoFiltros => {
  const desde = fecha(req.query.desde);
  const hastaBase = fecha(req.query.hasta);
  const hoy = new Date();
  const inicioHoy = new Date(
    Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate())
  );
  const entrega7 = req.query.entrega7 === "1";

  return {
    productoId: numeroPositivo(req.query.productoId),
    q: texto(req.query.q),
    estados: parsearEstados(req.query.estados),
    clienteId: numeroPositivo(req.query.clienteId),
    desde,
    hasta: hastaBase ? sumarDias(hastaBase, 1) : undefined,
    soloDeuda: req.query.deuda === "1",
    entregaDesde: entrega7 ? inicioHoy : undefined,
    entregaHasta: entrega7 ? sumarDias(inicioHoy, 7) : undefined,
    orden: texto(req.query.orden),
    dir: req.query.dir === "asc" ? "asc" : req.query.dir === "desc" ? "desc" : undefined,
  };
};

export const pedidoController = {
  ...crud,
  listar: asyncHandler(async (req: Request, res: Response) => {
    const filtros = parsearFiltros(req);

    if (req.query.page === undefined) {
      res.json(await pedidoService.listar(filtros));
      return;
    }

    const page = Math.max(1, Math.trunc(Number(req.query.page)) || 1);
    const requestedSize = Math.trunc(Number(req.query.pageSize)) || 25;
    const pageSize = Math.min(100, Math.max(1, requestedSize));
    res.json(await pedidoService.listarPaginado(page, pageSize, filtros));
  }),
  resumen: asyncHandler(async (_req: Request, res: Response) => {
    res.json(await pedidoService.resumen());
  }),
  pagar: asyncHandler(async (req: Request, res: Response) => {
    const { monto } = pagoPedidoSchema.parse(req.body ?? {});
    const pedido = await pedidoService.pagar(Number(req.params.id), monto);
    res.json(pedido);
  }),
};
