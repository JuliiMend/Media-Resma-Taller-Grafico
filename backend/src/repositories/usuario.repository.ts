import { prisma } from "@/config/db";

const usuarioPublicSelect = {
  id: true,
  nombre: true,
  email: true,
  fotoPerfil: true,
  activo: true,
} as const;

export const usuarioRepository = {
  findAll: () =>
    prisma.usuario.findMany({
      orderBy: { nombre: "asc" },
      select: usuarioPublicSelect,
    }),
  findById: (id: number) =>
    prisma.usuario.findUnique({
      where: { id },
      select: usuarioPublicSelect,
    }),
  create: (data: any) => prisma.usuario.create({ data }),
  update: (id: number, data: any) => prisma.usuario.update({ where: { id }, data }),
  remove: (id: number) => prisma.usuario.delete({ where: { id } }),
};
