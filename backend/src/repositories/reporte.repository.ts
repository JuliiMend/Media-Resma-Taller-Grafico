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
    productoId?: number,
    q?: string
  ): Promise<FilaVenta[]> => {
    const nombre = Prisma.sql`COALESCE(pr.nombre, NULLIF(TRIM(t.descripcion), ''), 'Sin descripción')`;
    const grupo = Prisma.sql`
      CASE
        WHEN t."productoId" IS NOT NULL THEN 'producto:' || t."productoId"::text
        ELSE 'descripcion:' || LOWER(TRIM(t.descripcion))
      END
    `;
    const filtroQ = q ? Prisma.sql`AND ${nombre} ILIKE ${`%${q}%`}` : Prisma.empty;

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
        (ARRAY_AGG(${nombre} ORDER BY t.id ASC))[1] AS "producto",
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
        ${filtroQ}
      GROUP BY 1, ${grupo}, t."productoId", COALESCE(pr.unidad, 'u')
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
