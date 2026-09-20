import { prisma } from "../config/db";
import { CrearInsumoInput, ActualizarInsumoInput } from "../schemas/insumo.schema";

// Esta capa es la única que le habla a Prisma directamente.
// Si el día de mañana cambiás de ORM o de motor de DB, solo tocás esto.
export const insumoRepository = {
  findAll: () => prisma.insumo.findMany({ orderBy: { nombre: "asc" } }),

  findById: (id: number) => prisma.insumo.findUnique({ where: { id } }),

  create: (data: CrearInsumoInput) => prisma.insumo.create({ data }),

  update: (id: number, data: ActualizarInsumoInput) =>
    prisma.insumo.update({ where: { id }, data }),

  remove: (id: number) => prisma.insumo.delete({ where: { id } }),

  findConStockBajo: () =>
    prisma.insumo.findMany({
      where: { activo: true },
    }).then((insumos) =>
      insumos.filter((i) => Number(i.stockActual) <= Number(i.stockMinimo))
    ),
};
