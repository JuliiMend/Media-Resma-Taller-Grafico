import { prisma } from "../config/db";
import { CrearCompraInput, ActualizarCompraInput } from "../schemas/compra.schema";

export const compraRepository = {
  findAll: () => prisma.compra.findMany({ orderBy: { fecha: "desc" } }),
  findById: (id: number) => prisma.compra.findUnique({ where: { id } }),
  create: (data: CrearCompraInput) => prisma.compra.create({ data }),
  update: (id: number, data: ActualizarCompraInput) =>
    prisma.compra.update({ where: { id }, data }),
  remove: (id: number) => prisma.compra.delete({ where: { id } }),
};
