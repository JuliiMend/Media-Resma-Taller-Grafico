import { Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import { pedidoRepository } from "../repositories/pedido.repository";
import { CrearPedidoInput, ActualizarPedidoInput } from "../schemas/pedido.schema";
import { HttpError } from "../utils/http-error";
import {
  describirCambios,
  ETIQUETAS_PEDIDO,
  formatearMoneda,
  registrarHistorial,
} from "./historial.helper";

type PedidoConDetalles = Prisma.PedidoGetPayload<{
  include: { cliente: true; trabajos: true };
}>;

const totalTrabajos = (trabajos: { cantidad: unknown; valorUnitario: unknown }[]) =>
  trabajos.reduce(
    (acc, t) => acc + Number(t.cantidad) * Number(t.valorUnitario),
    0
  );

export function conTotales(pedido: PedidoConDetalles) {
  const total = totalTrabajos(pedido.trabajos);
  const costoTotal = pedido.trabajos.reduce(
    (acc, t) => acc + Number(t.cantidad) * Number(t.costoUnitario ?? 0),
    0
  );

  return {
    ...pedido,
    total: total + Number(pedido.envio ?? 0),
    costoTotal,
    ganancia: total - costoTotal,
  };
}

const recalcularPedido = async (
  pedidoId: number,
  tx?: Prisma.TransactionClient
) => {
  const db = tx ?? prisma;
  const pedido = await db.pedido.findUnique({
    where: { id: pedidoId },
    include: { trabajos: true },
  });

  if (!pedido) throw new Error("Pedido no encontrado");
  if (pedido.trabajos.length === 0) return pedido;

  const total = totalTrabajos(pedido.trabajos) + Number(pedido.envio ?? 0);
  const restaPagar = Math.max(0, total - Number(pedido.sena ?? 0));

  return db.pedido.update({ where: { id: pedidoId }, data: { restaPagar } });
};

const buscarConDetalles = async (
  tx: Prisma.TransactionClient,
  pedidoId: number
) => {
  const pedido = await tx.pedido.findUnique({
    where: { id: pedidoId },
    include: { cliente: true, trabajos: true },
  });
  if (!pedido) throw new Error("Pedido no encontrado");
  return conTotales(pedido);
};

const describirCantidadTrabajos = (cantidad: number) =>
  `${cantidad} ${cantidad === 1 ? "trabajo" : "trabajos"}`;

export const pedidoService = {
  listar: async () => (await pedidoRepository.findAll()).map(conTotales),

  listarPaginado: async (page: number, pageSize: number) => {
    const { data, total } = await pedidoRepository.findAllPaginated(page, pageSize);
    return {
      data: data.map(conTotales),
      total,
      page,
      pageSize,
    };
  },

  obtener: async (id: number) => {
    const pedido = await pedidoRepository.findById(id);
    if (!pedido) throw new Error("Pedido no encontrado");
    return conTotales(pedido);
  },

  listarConSaldo: () => pedidoRepository.findConSaldo(),

  crear: async (data: CrearPedidoInput) => {
    const { trabajos = [], ...pedidoData } = data;

    const totalPedido = totalTrabajos(trabajos) + Number(pedidoData.envio ?? 0);
    if (Number(pedidoData.sena ?? 0) > totalPedido) {
      throw new HttpError(
        400,
        `La seña no puede superar el total del pedido (${formatearMoneda(totalPedido)})`
      );
    }

    return prisma.$transaction(async (tx) => {
      const pedido = await tx.pedido.create({ data: pedidoData });

      for (const trabajo of trabajos) {
        let costoUnitario: Prisma.Decimal | number | null =
          trabajo.costoUnitario ?? null;

        if (trabajo.productoId && costoUnitario == null) {
          const producto = await tx.producto.findUnique({
            where: { id: trabajo.productoId },
            select: { costo: true },
          });
          costoUnitario = producto?.costo ?? null;
        }

        await tx.trabajo.create({
          data: { ...trabajo, pedidoId: pedido.id, costoUnitario },
        });
      }

      await recalcularPedido(pedido.id, tx);
      const creado = await buscarConDetalles(tx, pedido.id);

      await registrarHistorial(tx, {
        accion: "CREAR",
        entidad: "pedido",
        entidadId: pedido.id,
        detalle:
          `Creó el pedido #${pedido.id} para ${creado.cliente.nombre}: ` +
          `${describirCantidadTrabajos(trabajos.length)}, total ${formatearMoneda(creado.total)}`,
      });

      return creado;
    });
  },

  actualizar: async (id: number, data: ActualizarPedidoInput) =>
    prisma.$transaction(async (tx) => {
      const antes = await tx.pedido.findUnique({
        where: { id },
        include: { cliente: true, trabajos: true },
      });
      if (!antes) throw new HttpError(404, "Pedido no encontrado");

      if (data.sena !== undefined && data.sena !== null) {
        const envio = data.envio !== undefined ? Number(data.envio ?? 0) : Number(antes.envio ?? 0);
        const total = totalTrabajos(antes.trabajos) + envio;
        if (Number(data.sena) > total) {
          throw new HttpError(
            400,
            `La seña no puede superar el total del pedido (${formatearMoneda(total)})`
          );
        }
      }

      await tx.pedido.update({ where: { id }, data });
      await recalcularPedido(id, tx);
      const pedido = await buscarConDetalles(tx, id);

      const cambios = describirCambios(antes, data, ETIQUETAS_PEDIDO);
      if (cambios) {
        await registrarHistorial(tx, {
          accion:
            data.estado !== undefined && data.estado !== antes.estado
              ? "CAMBIO_ESTADO"
              : "EDITAR",
          entidad: "pedido",
          entidadId: id,
          detalle: cambios,
        });
      }

      return pedido;
    }),

  pagar: async (id: number, monto?: number) =>
    prisma.$transaction(async (tx) => {
      const pedido = await tx.pedido.findUnique({
        where: { id },
        include: { trabajos: true },
      });
      if (!pedido) throw new Error("Pedido no encontrado");
      if (pedido.estado === "CANCELADO") {
        throw new HttpError(409, "No se pueden registrar pagos de un pedido cancelado");
      }

      const total = totalTrabajos(pedido.trabajos) + Number(pedido.envio ?? 0);
      const senaActual = Number(pedido.sena ?? 0);
      const saldoRestante = Math.max(0, total - senaActual);
      const montoAPagar = monto ?? saldoRestante;
      const tope = Math.max(total, senaActual);
      const nuevaSena = Math.min(senaActual + montoAPagar, tope);

      await tx.pedido.update({
        where: { id },
        data: { sena: nuevaSena },
      });
      const actualizado = await recalcularPedido(id, tx);

      await registrarHistorial(tx, {
        accion: "EDITAR",
        entidad: "pedido",
        entidadId: id,
        detalle:
          `Registró un pago de ${formatearMoneda(nuevaSena - senaActual)}. ` +
          `Resta ${formatearMoneda(actualizado.restaPagar)}`,
      });

      return buscarConDetalles(tx, id);
    }),

  eliminar: async (id: number) =>
    prisma.$transaction(async (tx) => {
      const pedido = await tx.pedido.findUnique({
        where: { id },
        include: { cliente: true, trabajos: true },
      });
      if (!pedido) throw new HttpError(404, "Pedido no encontrado");

      const trabajos = await tx.trabajo.findMany({
        where: { pedidoId: id },
        select: { id: true },
      });
      const trabajoIds = trabajos.map((t) => t.id);

      if (trabajoIds.length > 0) {
        await tx.movimientoStock.updateMany({
          where: { trabajoId: { in: trabajoIds } },
          data: { trabajoId: null },
        });
      }

      await tx.tarea.updateMany({
        where: { pedidoId: id },
        data: { pedidoId: null },
      });
      await tx.trabajo.deleteMany({ where: { pedidoId: id } });

      await registrarHistorial(tx, {
        accion: "ELIMINAR",
        entidad: "pedido",
        entidadId: id,
        detalle:
          `Eliminó el pedido #${id} de ${pedido.cliente.nombre} ` +
          `(total ${formatearMoneda(totalTrabajos(pedido.trabajos) + Number(pedido.envio ?? 0))}, ` +
          `${describirCantidadTrabajos(pedido.trabajos.length)})`,
      });

      await tx.pedido.delete({ where: { id } });
    }),

  recalcularPedido,

  listarProximosAEntregar: async (desde: Date, hasta: Date) => {
    return pedidoRepository.findProximosAEntregar(desde, hasta);
  },
};
