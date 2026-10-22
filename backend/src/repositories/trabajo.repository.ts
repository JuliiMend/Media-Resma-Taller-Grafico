import { prisma } from "../config/db";
import { CrearTrabajoInput, ActualizarTrabajoInput } from "../schemas/trabajo.schema";

export const trabajoRepository = {
  findAll: () => prisma.trabajo.findMany({ orderBy: { id: "desc" } }),
  sugerencias: (q: string, limite = 8) =>
    prisma.trabajo
      .findMany({
        where: { descripcion: { contains: q, mode: "insensitive" } },
        select: { descripcion: true },
        distinct: ["descripcion"],
        orderBy: { descripcion: "asc" },
        take: limite * 2,
      })
      .then((filas) => {
        const vistos = new Set<string>();
        return filas
          .map((fila) => fila.descripcion.trim())
          .filter((descripcion) => {
            const clave = descripcion.toLocaleLowerCase();
            if (!descripcion || vistos.has(clave)) return false;
            vistos.add(clave);
            return true;
          })
          .slice(0, limite);
      }),
  findById: (id: number) => prisma.trabajo.findUnique({ where: { id } }),
  create: (data: CrearTrabajoInput) => prisma.trabajo.create({ data }),
  update: (id: number, data: ActualizarTrabajoInput) =>
    prisma.trabajo.update({ where: { id }, data }),
  remove: (id: number) => prisma.trabajo.delete({ where: { id } }),
};
