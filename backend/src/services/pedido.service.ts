import { Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import { PedidoFiltros, pedidoRepository } from "../repositories/pedido.repository";
import { CrearPedidoInput, ActualizarPedidoInput } from "../schemas/pedido.schema";
import { HttpError } from "../utils/http-error";
import {
  normalizarResta,
  redondearMoneda,
} from "../utils/dinero";
import {
  describirCambios,
  ETIQUETAS_PEDIDO,
  formatearMoneda,
  registrarHistorial,
} from "./historial.helper";
import { calcularPago, totalTrabajos } from "./pedido.pagos";

type PedidoConDetalles = Prisma.PedidoGetPayload<{
  include: { cliente: true; trabajos: true };
}>;

export function conTotales(pedido: PedidoConDetalles) {
  const totalTrabajosPedido = totalTrabajos(pedido.trabajos);
  const total = totalTrabajosPedido + Number(pedido.envio ?? 0);
  const trabajosConCosto = pedido.trabajos.filter(
    (t) => t.costoUnitario !== null && t.costoUnitario !== undefined
  );
  const ventaConCosto = totalTrabajos(trabajosConCosto);
  const costoTotal = trabajosConCosto.reduce(
    (acc, t) => acc + Number(t.cantidad) * Number(t.costoUnitario),
    0
  );
  // La ganancia y el margen solo se calculan sobre trabajos con costo cargado.
  // Si falta algún costo no se asume 0: se marca costoCompleto = false.
  const ganancia = ventaConCosto - costoTotal;
  const margen = ventaConCosto > 0 ? (ganancia / ventaConCosto) * 100 : null;
  const recargo = costoTotal > 0 ? (ganancia / costoTotal) * 100 : null;
  const costoCompleto = pedido.trabajos.every(
    (t) => t.costoUnitario !== null && t.costoUnitario !== undefined
  );

  return {
    ...pedido,
    total,
    ventaConCosto,
    costoTotal,
    ganancia,
    margen,
    recargo,
    costoCompleto,
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

  const total = redondearMoneda(
    totalTrabajos(pedido.trabajos) + Number(pedido.envio ?? 0)
  );
  const restaPagar = normalizarResta(total - Number(pedido.sena ?? 0));

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
  listar: async (filtros: PedidoFiltros = {}) =>
    (await pedidoRepository.findAll(filtros)).map(conTotales),

  /** Pedidos con saldo pendiente, sin cancelados, para la pestaña Deudas. */
  listarDeudas: async () =>
    (
      await pedidoRepository.findAll({
        soloDeuda: true,
        orden: "fecha",
        dir: "asc",
      })
    ).map(conTotales),

  listarPaginado: async (page: number, pageSize: number, filtros: PedidoFiltros = {}) => {
    const { data, total } = await pedidoRepository.findAllPaginated(page, pageSize, filtros);
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

  resumen: () => pedidoRepository.resumen(),

  listarConSaldo: () => pedidoRepository.findConSaldo(),

  crear: async (data: CrearPedidoInput) => {
    const { trabajos = [], ...pedidoData } = data;

    const totalPedido = redondearMoneda(
      totalTrabajos(trabajos) + Number(pedidoData.envio ?? 0)
    );
    const sena = redondearMoneda(Number(pedidoData.sena ?? 0));
    if (sena > totalPedido) {
      throw new HttpError(
        400,
        `La seña no puede superar el total del pedido (${formatearMoneda(totalPedido)})`
      );
    }

    const datosPedido = {
      ...pedidoData,
      sena,
      ...(pedidoData.restaPagar !== undefined && pedidoData.restaPagar !== null
        ? { restaPagar: normalizarResta(Number(pedidoData.restaPagar)) }
        : {}),
    };

    return prisma.$transaction(async (tx) => {
      const pedido = await tx.pedido.create({ data: datosPedido });

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

  actualizar: async (id: number, data: ActualizarPedidoInput) => {
    const soloEstado =
      data.estado !== undefined &&
      Object.keys(data).every((clave) => clave === "estado");

    if (soloEstado) {
      return prisma.$transaction(async (tx) => {
        const antes = await pedidoRepository.findEstado(tx, id);
        if (!antes) throw new HttpError(404, "Pedido no encontrado");

        const actualizado = await pedidoRepository.updateEstado(tx, id, data.estado!);

        if (actualizado.estado !== antes.estado) {
          await registrarHistorial(tx, {
            accion: "CAMBIO_ESTADO",
            entidad: "pedido",
            entidadId: id,
            detalle: `Estado: ${antes.estado} → ${actualizado.estado}`,
          });
        }

        return actualizado;
      });
    }

    return prisma.$transaction(async (tx) => {
      const antes = await tx.pedido.findUnique({
        where: { id },
        include: { cliente: true, trabajos: true },
      });
      if (!antes) throw new HttpError(404, "Pedido no encontrado");

      const sena =
        data.sena !== undefined && data.sena !== null
          ? redondearMoneda(Number(data.sena))
          : data.sena;
      const restaPagar =
        data.restaPagar !== undefined && data.restaPagar !== null
          ? normalizarResta(Number(data.restaPagar))
          : data.restaPagar;

      const datos: ActualizarPedidoInput = {
        ...data,
        ...(data.sena !== undefined ? { sena } : {}),
        ...(data.restaPagar !== undefined ? { restaPagar } : {}),
      };

      if (typeof sena === "number") {
        const envio =
          data.envio !== undefined
            ? Number(data.envio ?? 0)
            : Number(antes.envio ?? 0);
        const total = redondearMoneda(totalTrabajos(antes.trabajos) + envio);
        if (sena > total) {
          throw new HttpError(
            400,
            `La seña no puede superar el total del pedido (${formatearMoneda(total)})`
          );
        }
      }

      await tx.pedido.update({ where: { id }, data: datos });
      await recalcularPedido(id, tx);
      const pedido = await buscarConDetalles(tx, id);

      const cambios = describirCambios(antes, datos, ETIQUETAS_PEDIDO);
      if (cambios) {
        await registrarHistorial(tx, {
          accion:
            datos.estado !== undefined && datos.estado !== antes.estado
              ? "CAMBIO_ESTADO"
              : "EDITAR",
          entidad: "pedido",
          entidadId: id,
          detalle: cambios,
        });
      }

      return pedido;
    });
  },

  pagar: async (id: number, monto?: number) =>
    prisma.$transaction(async (tx) => {
      const pedido = await tx.pedido.findUnique({
        where: { id },
        include: { trabajos: true },
      });
      if (!pedido) throw new HttpError(404, "Pedido no encontrado");

      const pago = calcularPago({
        estado: pedido.estado,
        trabajos: pedido.trabajos,
        envio: pedido.envio,
        sena: pedido.sena,
        restaPagar: pedido.restaPagar,
        monto,
      });

      // Se actualizan seña y resta juntas: no se depende de recalcularPedido,
      // que no recalcula pedidos sin trabajos.
      await tx.pedido.update({
        where: { id },
        data: { sena: pago.sena, restaPagar: pago.restaPagar },
      });

      await registrarHistorial(tx, {
        accion: "EDITAR",
        entidad: "pedido",
        entidadId: id,
        detalle:
          `Registró un pago de ${formatearMoneda(pago.montoAplicado)}. ` +
          `Resta ${formatearMoneda(pago.restaPagar)}`,
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
