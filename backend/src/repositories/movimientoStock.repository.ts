import { prisma } from "../config/db";
import { CrearMovimientoStockInput, ActualizarMovimientoStockInput } from "../schemas/movimientoStock.schema";

export const movimientoStockRepository = {
  findAll: () => prisma.movimientoStock.findMany({ orderBy: { fecha: "desc" } }),
  findById: (id: number) => prisma.movimientoStock.findUnique({ where: { id } }),
  create: (data: CrearMovimientoStockInput) => prisma.movimientoStock.create({ data }),
  update: (id: number, data: ActualizarMovimientoStockInput) =>
    prisma.movimientoStock.update({ where: { id }, data }),
  remove: (id: number) => prisma.movimientoStock.delete({ where: { id } }),
};
