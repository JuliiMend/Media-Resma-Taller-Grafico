import { prisma } from "../config/db";
import { ActualizarTareaInput, CrearTareaInput } from "../schemas/tarea.schema";

export const tareaRepository = {
  findAll: () =>
    prisma.tarea.findMany({
      orderBy: [{ fechaLimite: "asc" }, { creadoEn: "desc" }],
      include: { usuario: true, pedido: true },
    }),
  findById: (id: number) =>
    prisma.tarea.findUnique({ where: { id }, include: { usuario: true, pedido: true } }),
  findAlertas: (desde: Date, hasta: Date) =>
    prisma.tarea.findMany({
      where: {
        fechaLimite: { gte: desde, lte: hasta },
        estado: { not: "COMPLETADA" },
      },
      orderBy: { fechaLimite: "asc" },
      include: { pedido: true },
    }),
  create: (data: CrearTareaInput) => prisma.tarea.create({ data }),
  update: (id: number, data: ActualizarTareaInput) => prisma.tarea.update({ where: { id }, data }),
  remove: (id: number) => prisma.tarea.delete({ where: { id } }),
};
