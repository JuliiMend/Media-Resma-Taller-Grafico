import { Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import { trabajoRepository } from "../repositories/trabajo.repository";
import { pedidoService } from "./pedido.service";
import { CrearTrabajoInput, ActualizarTrabajoInput } from "../schemas/trabajo.schema";
import { HttpError } from "../utils/http-error";
import {
  describirCambios,
  ETIQUETAS_TRABAJO,
  formatearCantidad,
  formatearMoneda,
  registrarHistorial,
} from "./historial.helper";

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

      await registrarHistorial(tx, {
        accion: "CREAR",
        entidad: "pedido",
        entidadId: trabajo.pedidoId,
        detalle:
          `Agregó el trabajo "${trabajo.descripcion}" ` +
          `(${formatearCantidad(trabajo.cantidad)} × ${formatearMoneda(trabajo.valorUnitario)})`,
      });

      return trabajo;
    }),

  actualizar: async (id: number, data: ActualizarTrabajoInput) =>
    prisma.$transaction(async (tx) => {
      const anterior = await tx.trabajo.findUnique({ where: { id } });
      if (!anterior) throw new HttpError(404, "Trabajo no encontrado");

      const trabajo = await tx.trabajo.update({ where: { id }, data });

      await pedidoService.recalcularPedido(anterior.pedidoId, tx);
      if (trabajo.pedidoId !== anterior.pedidoId) {
        await pedidoService.recalcularPedido(trabajo.pedidoId, tx);
      }

      const cambios = describirCambios(anterior, data, ETIQUETAS_TRABAJO);
      if (cambios) {
        await registrarHistorial(tx, {
          accion: "EDITAR",
          entidad: "pedido",
          entidadId: trabajo.pedidoId,
          detalle: `Actualizó el trabajo "${anterior.descripcion}":\n${cambios}`,
        });
      }

      return trabajo;
    }),

  eliminar: async (id: number) =>
    prisma.$transaction(async (tx) => {
      const trabajo = await tx.trabajo.findUnique({ where: { id } });
      if (!trabajo) throw new HttpError(404, "Trabajo no encontrado");

      await tx.movimientoStock.updateMany({
        where: { trabajoId: id },
        data: { trabajoId: null },
      });
      await tx.trabajo.delete({ where: { id } });

      await pedidoService.recalcularPedido(trabajo.pedidoId, tx);

      await registrarHistorial(tx, {
        accion: "ELIMINAR",
        entidad: "pedido",
        entidadId: trabajo.pedidoId,
        detalle: `Quitó el trabajo "${trabajo.descripcion}"`,
      });
    }),
};
