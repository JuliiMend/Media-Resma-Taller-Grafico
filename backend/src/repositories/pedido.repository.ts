import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const pedidoRepository = {
    findAll: () => prisma.pedido.findMany({ orderBy: { fecha: "desc" } }),

    findById: (id: number) => prisma.pedido.findUnique({ where: { id } }),

    findConSaldo: () =>
        prisma.pedido.findMany({
            where: { restaPagar: { gt: 0 } },
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
                    not: "ENTREGADO"
                }
            },
            include: { cliente: true },
        }),

    create: (data: CrearPedidoInput) => prisma.pedido.create({ data }),

    update: (id: number, data: ActualizarPedidoInput) =>
        prisma.pedido.update({ where: { id }, data }),

    remove: (id: number) => prisma.pedido.delete({ where: { id } }),
};