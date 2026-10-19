import { Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import { trabajoRepository } from "../repositories/trabajo.repository";
import { pedidoService } from "./pedido.service";
import { CrearTrabajoInput, ActualizarTrabajoInput } from "../schemas/trabajo.schema";

export const trabajoService = {
  listar: () => trabajoRepository.findAll(),

  obtener: async (id: number) => {
    const trabajo = await trabajoRepository.findById(id);
    if (!trabajo) throw new Error("Trabajo no encontrado");
    return trabajo;
  },

  crear: async (data: CrearTrabajoInput) =>
    prisma.$transaction(async (tx) => {
      let costoUnitario: Prisma.Decimal | number | null =
        data.costoUnitario ?? null;

      if (data.productoId && costoUnitario == null) {
        const producto = await tx.producto.findUnique({
          where: { id: data.productoId },
          select: { costo: true },
        });
        costoUnitario = producto?.costo ?? null;
      }

      const trabajo = await tx.trabajo.create({
        data: { ...data, costoUnitario },
      });

      await pedidoService.recalcularPedido(data.pedidoId, tx);
      return trabajo;
    }),

  actualizar: async (id: number, data: ActualizarTrabajoInput) =>
    prisma.$transaction(async (tx) => {
      const anterior = await tx.trabajo.findUnique({ where: { id } });
      if (!anterior) throw new Error("Trabajo no encontrado");

      const trabajo = await tx.trabajo.update({ where: { id }, data });

      await pedidoService.recalcularPedido(anterior.pedidoId, tx);
      if (trabajo.pedidoId !== anterior.pedidoId) {
        await pedidoService.recalcularPedido(trabajo.pedidoId, tx);
      }

      return trabajo;
    }),

  eliminar: async (id: number) =>
    prisma.$transaction(async (tx) => {
      const trabajo = await tx.trabajo.findUnique({ where: { id } });
      if (!trabajo) throw new Error("Trabajo no encontrado");

      await tx.movimientoStock.updateMany({
        where: { trabajoId: id },
        data: { trabajoId: null },
      });
      await tx.trabajo.delete({ where: { id } });

      await pedidoService.recalcularPedido(trabajo.pedidoId, tx);
    }),
};
