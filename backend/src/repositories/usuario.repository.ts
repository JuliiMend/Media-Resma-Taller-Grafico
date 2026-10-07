import { prisma } from "@/config/db";
import { CrearUsuarioInput, ActualizarUsuarioInput } from "@/schemas/usuario.schema";

export const usuarioRepository = {
  findAll: () => prisma.usuario.findMany({ orderBy: { nombre: "asc" } }),
  findById: (id: number) => prisma.usuario.findUnique({ where: { id } }),
  create: (data: CrearUsuarioInput) => prisma.usuario.create({ data }),
  update: (id: number, data: ActualizarUsuarioInput) =>
    prisma.usuario.update({ where: { id }, data }),
  remove: (id: number) => prisma.usuario.delete({ where: { id } }),
};
