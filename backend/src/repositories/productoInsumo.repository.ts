import { prisma } from "../config/db";
import { CrearProductoInsumoInput, ActualizarProductoInsumoInput } from "../schemas/productoInsumo.schema";

export const productoInsumoRepository = {
  findAll: () => prisma.productoInsumo.findMany({ orderBy: { id: "asc" } }),
  findById: (id: number) => prisma.productoInsumo.findUnique({ where: { id } }),
  create: (data: CrearProductoInsumoInput) => prisma.productoInsumo.create({ data }),
  update: (id: number, data: ActualizarProductoInsumoInput) =>
    prisma.productoInsumo.update({ where: { id }, data }),
  remove: (id: number) => prisma.productoInsumo.delete({ where: { id } }),
};
