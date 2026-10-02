import { prisma } from "../config/db";
import { CrearProductoInput, ActualizarProductoInput } from "../schemas/producto.schema";

export const productoRepository = {
  findAll: () => prisma.producto.findMany({ orderBy: { nombre: "asc" } }),
  findById: (id: number) => prisma.producto.findUnique({ where: { id } }),
  create: (data: CrearProductoInput) => prisma.producto.create({ data }),
  update: (id: number, data: ActualizarProductoInput) =>
    prisma.producto.update({ where: { id }, data }),
  remove: (id: number) => prisma.producto.delete({ where: { id } }),
};
