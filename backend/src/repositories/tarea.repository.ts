import { prisma } from "../config/db";
import { ActualizarTareaInput, CrearTareaInput } from "../schemas/tarea.schema";

/** Datos mínimos del pedido para mostrar su etiqueta en el listado de tareas. */
const pedidoResumen = {
  select: {
    id: true,
    observaciones: true,
    estado: true,
    cliente: { select: { nombre: true } },
    trabajos: {
      select: {
        descripcion: true,
        producto: { select: { nombre: true } },
      },
    },
  },
} as const;

export const tareaRepository = {
  findAll: () =>
    prisma.tarea.findMany({
      orderBy: [{ fechaLimite: "asc" }, { creadoEn: "desc" }],
      include: { usuario: true, pedido: pedidoResumen },
    }),
  findById: (id: number) =>
    prisma.tarea.findUnique({ where: { id }, include: { usuario: true, pedido: pedidoResumen } }),
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
