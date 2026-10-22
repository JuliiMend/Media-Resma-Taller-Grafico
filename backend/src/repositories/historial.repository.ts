import { Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import {
  ActualizarHistorialInput,
  FiltrosHistorial,
  NuevoHistorialInput,
} from "../schemas/historial.schema";

const usuarioHistorialSelect = {
  id: true,
  nombre: true,
  fotoPerfil: true,
} as const;

export const historialRepository = {
  findAll: (filtros: FiltrosHistorial = {}) =>
    prisma.historial.findMany({
      where: construirWhere(filtros),
      orderBy: { fecha: "desc" },
      include: { usuario: { select: usuarioHistorialSelect } },
    }),
  findById: (id: number) =>
    prisma.historial.findUnique({
      where: { id },
      include: { usuario: { select: usuarioHistorialSelect } },
    }),
  create: (data: NuevoHistorialInput) => prisma.historial.create({ data }),
  update: (id: number, data: ActualizarHistorialInput) =>
    prisma.historial.update({ where: { id }, data }),
  remove: (id: number) => prisma.historial.delete({ where: { id } }),
};

function construirWhere(filtros: FiltrosHistorial): Prisma.HistorialWhereInput {
  const where: Prisma.HistorialWhereInput = {};
  if (filtros.entidad) where.entidad = filtros.entidad;
  if (filtros.entidadId) where.entidadId = filtros.entidadId;
  if (filtros.usuarioId) where.usuarioId = filtros.usuarioId;
  if (filtros.desde || filtros.hasta) {
    where.fecha = {
      ...(filtros.desde ? { gte: filtros.desde } : {}),
      ...(filtros.hasta ? { lte: filtros.hasta } : {}),
    };
  }
  return where;
}
