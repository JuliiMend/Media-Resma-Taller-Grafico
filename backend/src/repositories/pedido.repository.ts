import { Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import { CrearPedidoInput, ActualizarPedidoInput } from "@/schemas/pedido.schema";

export interface PedidoFiltros {
  productoId?: number;
  q?: string;
  estados?: string[];
  clienteId?: number;
  desde?: Date;
  hasta?: Date;
  soloDeuda?: boolean;
  entregaDesde?: Date;
  entregaHasta?: Date;
  orden?: string;
  dir?: "asc" | "desc";
}

export interface PedidoResumen {
  activos: number;
  saldoPendiente: number;
  conDeuda: number;
}

const buildWhere = (filtros: PedidoFiltros = {}): Prisma.PedidoWhereInput => {
  const condiciones: Prisma.PedidoWhereInput[] = [];

  if (filtros.productoId !== undefined) {
    condiciones.push({ trabajos: { some: { productoId: filtros.productoId } } });
  }
  if (filtros.estados !== undefined) {
    condiciones.push({ estado: { in: filtros.estados } });
  }
  if (filtros.clienteId !== undefined) {
    condiciones.push({ clienteId: filtros.clienteId });
  }
  if (filtros.desde !== undefined || filtros.hasta !== undefined) {
    condiciones.push({
      fecha: {
        ...(filtros.desde !== undefined ? { gte: filtros.desde } : {}),
        ...(filtros.hasta !== undefined ? { lt: filtros.hasta } : {}),
      },
    });
  }
  if (filtros.soloDeuda) {
    condiciones.push({ estado: { not: "CANCELADO" }, restaPagar: { gt: 0 } });
  }
  if (filtros.entregaDesde !== undefined || filtros.entregaHasta !== undefined) {
    condiciones.push({
      fechaEntrega: {
        ...(filtros.entregaDesde !== undefined ? { gte: filtros.entregaDesde } : {}),
        ...(filtros.entregaHasta !== undefined ? { lte: filtros.entregaHasta } : {}),
      },
    });
  }
  if (filtros.q) {
    condiciones.push({
      OR: [
        { cliente: { nombre: { contains: filtros.q, mode: "insensitive" } } },
        { trabajos: { some: { descripcion: { contains: filtros.q, mode: "insensitive" } } } },
        {
          trabajos: {
            some: { producto: { nombre: { contains: filtros.q, mode: "insensitive" } } },
          },
        },
      ],
    });
  }

  return condiciones.length > 0 ? { AND: condiciones } : {};
};

const buildOrderBy = (filtros: PedidoFiltros = {}): Prisma.PedidoOrderByWithRelationInput[] => {
  const dir = filtros.dir ?? "desc";
  switch (filtros.orden) {
    case "entrega":
      return [{ fechaEntrega: { sort: dir, nulls: "last" } }, { fecha: "desc" }];
    case "cliente":
      return [{ cliente: { nombre: dir } }];
    case "resta":
      return [{ restaPagar: dir }];
    case "total":
      return [{ restaPagar: dir }, { sena: dir }];
    default:
      return [{ fecha: dir }, { id: dir }];
  }
};

export const pedidoRepository = {
  findAll: (filtros: PedidoFiltros = {}) =>
    prisma.pedido.findMany({
      where: buildWhere(filtros),
      orderBy: buildOrderBy(filtros),
      include: { cliente: true, trabajos: true },
    }),

  findAllPaginated: async (page: number, pageSize: number, filtros: PedidoFiltros = {}) => {
    const where = buildWhere(filtros);
    const [total, data] = await prisma.$transaction([
      prisma.pedido.count({ where }),
      prisma.pedido.findMany({
        where,
        orderBy: buildOrderBy(filtros),
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { cliente: true, trabajos: true },
      }),
    ]);
    return { data, total };
  },

  findById: (id: number) =>
    prisma.pedido.findUnique({
      where: { id },
      include: { cliente: true, trabajos: true },
    }),

  findEstado: (tx: Prisma.TransactionClient, id: number) =>
    tx.pedido.findUnique({ where: { id }, select: { estado: true } }),

  updateEstado: (tx: Prisma.TransactionClient, id: number, estado: string) =>
    tx.pedido.update({
      where: { id },
      data: { estado },
      select: { id: true, estado: true, sena: true, restaPagar: true },
    }),

  findConSaldo: () =>
    prisma.pedido.findMany({
      where: {
        restaPagar: { gt: 0 },
        estado: { not: "CANCELADO" },
      },
      orderBy: { fecha: "asc" },
      include: { cliente: true },
    }),

  findProximosAEntregar: (desde: Date, hasta: Date) =>
    prisma.pedido.findMany({
      where: {
        fechaEntrega: {
          gte: desde,
          lte: hasta,
        },
        estado: {
          notIn: ["ENTREGADO", "CANCELADO"],
        },
      },
      include: { cliente: true },
    }),

  resumen: async (): Promise<PedidoResumen> => {
    const [fila] = await prisma.$queryRaw<
      { activos: number; saldoPendiente: number; conDeuda: number }[]
    >(Prisma.sql`
      SELECT
        COUNT(*) FILTER (WHERE "estado" NOT IN ('ENTREGADO', 'CANCELADO'))::int AS "activos",
        COALESCE(SUM("restaPagar") FILTER (WHERE "estado" <> 'CANCELADO'), 0)::float8 AS "saldoPendiente",
        COUNT(*) FILTER (WHERE "estado" <> 'CANCELADO' AND COALESCE("restaPagar", 0) > 0)::int AS "conDeuda"
      FROM "Pedido"
    `);
    return {
      activos: Number(fila?.activos ?? 0),
      saldoPendiente: Number(fila?.saldoPendiente ?? 0),
      conDeuda: Number(fila?.conDeuda ?? 0),
    };
  },

  create: (data: Omit<CrearPedidoInput, "trabajos">) =>
    prisma.pedido.create({ data }),

  update: (id: number, data: ActualizarPedidoInput) =>
    prisma.pedido.update({ where: { id }, data }),

  remove: (id: number) => prisma.pedido.delete({ where: { id } }),
};
