import { prisma } from "../config/db";
import { ActualizarGastoInput, CrearGastoInput } from "../schemas/gasto.schema";

export const gastoRepository = {
  findAll: () => prisma.gasto.findMany({ orderBy: { fecha: "desc" } }),
  findById: (id: number) => prisma.gasto.findUnique({ where: { id } }),
  create: (data: CrearGastoInput) => prisma.gasto.create({ data }),
  update: (id: number, data: ActualizarGastoInput) => prisma.gasto.update({ where: { id }, data }),
  remove: (id: number) => prisma.gasto.delete({ where: { id } }),
};
