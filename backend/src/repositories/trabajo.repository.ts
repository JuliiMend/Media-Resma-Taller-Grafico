import { prisma } from "../config/db";
import { CrearTrabajoInput, ActualizarTrabajoInput } from "../schemas/trabajo.schema";

export const trabajoRepository = {
  findAll: () => prisma.trabajo.findMany({ orderBy: { id: "desc" } }),
  findById: (id: number) => prisma.trabajo.findUnique({ where: { id } }),
  create: (data: CrearTrabajoInput) => prisma.trabajo.create({ data }),
  update: (id: number, data: ActualizarTrabajoInput) =>
    prisma.trabajo.update({ where: { id }, data }),
  remove: (id: number) => prisma.trabajo.delete({ where: { id } }),
};
