import { Prisma } from "@prisma/client";
import { prisma } from "../config/db";

export interface FilaVenta {
  mes: string;
  productoId: number | null;
  producto: string;
  unidad: string;
  cantidad: number;
  ingresos: number;
  costo: number;
  ganancia: number;
}

interface FilaVentaCruda {
  mes: string;
  productoId: number | null;
  producto: string;
  unidad: string;
  cantidad: number;
  ingresos: number;
  costo: number;
}

export const reporteRepository = {
  ventas: async (
    desde: string,
    hasta: string,
    productoId?: number
  ): Promise<FilaVenta[]> => {
    const filas = await prisma.$queryRaw<FilaVentaCruda[]>(Prisma.sql`
      SELECT
        to_char(
          date_trunc(
            'month',
            (p.fecha AT TIME ZONE 'UTC') AT TIME ZONE 'America/Argentina/Buenos_Aires'
          ),
          'YYYY-MM'
        ) AS "mes",
        t."productoId" AS "productoId",
        COALESCE(pr.nombre, 'Sin producto') AS "producto",
        COALESCE(pr.unidad, 'u') AS "unidad",
        SUM(t.cantidad)::float8 AS "cantidad",
        SUM(t.cantidad * t."valorUnitario")::float8 AS "ingresos",
        SUM(t.cantidad * COALESCE(t."costoUnitario", 0))::float8 AS "costo"
      FROM "Pedido" p
      JOIN "Trabajo" t ON t."pedidoId" = p.id
      LEFT JOIN "Producto" pr ON pr.id = t."productoId"
      WHERE p.estado <> 'CANCELADO'
        AND ((p.fecha AT TIME ZONE 'UTC') AT TIME ZONE 'America/Argentina/Buenos_Aires') >= ${desde}::date
        AND ((p.fecha AT TIME ZONE 'UTC') AT TIME ZONE 'America/Argentina/Buenos_Aires') < (${hasta}::date + INTERVAL '1 day')
        ${productoId != null ? Prisma.sql`AND t."productoId" = ${productoId}` : Prisma.empty}
      GROUP BY 1, 2, 3, 4
      ORDER BY "mes" DESC, "producto" ASC
    `);

    return filas.map((fila) => ({
      mes: fila.mes,
      productoId: fila.productoId ?? null,
      producto: fila.producto,
      unidad: fila.unidad,
      cantidad: Number(fila.cantidad),
      ingresos: Number(fila.ingresos),
      costo: Number(fila.costo),
      ganancia: Number(fila.ingresos) - Number(fila.costo),
    }));
  },
};
