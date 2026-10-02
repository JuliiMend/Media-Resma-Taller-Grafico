import { prisma } from "../config/db";
import { ActualizarHistorialInput, CrearHistorialInput } from "../schemas/historial.schema";

export const historialRepository = {
  findAll: () =>
    prisma.historial.findMany({ orderBy: { fecha: "desc" }, include: { usuario: true } }),
  findById: (id: number) =>
    prisma.historial.findUnique({ where: { id }, include: { usuario: true } }),
  create: (data: CrearHistorialInput) => prisma.historial.create({ data }),
  update: (id: number, data: ActualizarHistorialInput) =>
    prisma.historial.update({ where: { id }, data }),
  remove: (id: number) => prisma.historial.delete({ where: { id } }),
};
