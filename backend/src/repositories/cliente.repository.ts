import { prisma } from "../config/db";
import { CrearClienteInput, ActualizarClienteInput } from "../schemas/cliente.schema";

export const clienteRepository = {
  findAll: () => prisma.cliente.findMany({ orderBy: { nombre: "asc" } }),
  findById: (id: number) => prisma.cliente.findUnique({ where: { id } }),
  create: (data: CrearClienteInput) => prisma.cliente.create({ data }),
  update: (id: number, data: ActualizarClienteInput) =>
    prisma.cliente.update({ where: { id }, data }),
  remove: (id: number) => prisma.cliente.delete({ where: { id } }),
};
