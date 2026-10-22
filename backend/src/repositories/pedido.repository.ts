import { prisma } from "../config/db";
import { CrearPedidoInput, ActualizarPedidoInput } from "@/schemas/pedido.schema";

const wherePorProducto = (productoId?: number) =>
    productoId !== undefined
        ? { trabajos: { some: { productoId } } }
        : {};

export const pedidoRepository = {
    findAll: (productoId?: number) =>
        prisma.pedido.findMany({
            where: wherePorProducto(productoId),
            orderBy: { fecha: "desc" },
            include: { cliente: true, trabajos: true },
        }),

    findAllPaginated: async (page: number, pageSize: number, productoId?: number) => {
        const where = wherePorProducto(productoId);
        const [total, data] = await prisma.$transaction([
            prisma.pedido.count({ where }),
            prisma.pedido.findMany({
                where,
                orderBy: { fecha: "desc" },
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

    create: (data: Omit<CrearPedidoInput, "trabajos">) =>
        prisma.pedido.create({ data }),

    update: (id: number, data: ActualizarPedidoInput) =>
        prisma.pedido.update({ where: { id }, data }),

    remove: (id: number) => prisma.pedido.delete({ where: { id } }),
};
