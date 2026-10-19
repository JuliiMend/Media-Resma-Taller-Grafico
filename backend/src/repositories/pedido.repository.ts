import { prisma } from "../config/db";
import { CrearPedidoInput, ActualizarPedidoInput } from "@/schemas/pedido.schema";

export const pedidoRepository = {
    findAll: () =>
        prisma.pedido.findMany({
            orderBy: { fecha: "desc" },
            include: { cliente: true, trabajos: true },
        }),

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
