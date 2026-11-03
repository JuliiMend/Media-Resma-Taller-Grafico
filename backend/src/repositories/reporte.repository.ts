import { Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import { margenSobreVenta } from "../services/reporte.calculos";

export interface FilaVenta {
  productoId: number | null;
  producto: string;
  unidad: string;
  cantidad: number;
  ingresos: number;
  costo: number;
  ganancia: number;
  margen: number | null;
  costoCompleto: boolean;
  trabajosSinCosto: number;
}

export interface TotalesPeriodo {
  ingresos: number;
  costo: number;
  ganancia: number;
  margen: number | null;
  pedidos: number;
  costoCompleto: boolean;
  trabajosSinCosto: number;
}

export interface FilaRanking extends FilaVenta {
  gananciaUnidad: number | null;
  porcentajeGanancia: number | null;
}

export interface RankingResultado {
  data: FilaRanking[];
  total: number;
  page: number;
  pageSize: number;
}

export interface BalanceResumen {
  ingresos: number;
  costoTrabajos: number;
  gananciaBruta: number;
  gastos: number;
  comprasInsumos: number;
  resultado: number;
  cajaEstimada: number;
  costoCompleto: boolean;
  trabajosSinCosto: number;
}

export interface CompraPeriodo {
  id: number;
  insumoId: number;
  fecha: string;
  cantidad: number;
  precio: number;
  medioPago: string | null;
  insumo: { nombre: string; unidad: string };
}

export interface GastoPeriodo {
  id: number;
  concepto: string;
  monto: number;
  fecha: string;
  medioPago: string | null;
}

export interface GastoPorCategoria {
  categoria: string;
  monto: number;
}

export interface BalanceResultado {
  actual: BalanceResumen;
  anterior: BalanceResumen | null;
  gastosPorCategoria: GastoPorCategoria[];
  compras: CompraPeriodo[];
  gastos: GastoPeriodo[];
}

interface TotalesCrudos {
  ingresos: number;
  costo: number;
  ganancia: number;
  pedidos: number;
  costoCompleto: boolean;
  trabajosSinCosto: number;
}

interface FilaVentaCruda {
  productoId: number | null;
  producto: string;
  unidad: string;
  cantidad: number;
  ingresos: number;
  costo: number;
  ganancia: number;
  costoCompleto: boolean;
  trabajosSinCosto: number;
}

interface FilaRankingCruda extends FilaVentaCruda {
  margen: number | null;
  gananciaUnidad: number | null;
}

interface CompraCruda {
  id: number;
  insumoId: number;
  fecha: Date;
  cantidad: number;
  precio: number;
  medioPago: string | null;
  insumoNombre: string;
  insumoUnidad: string;
}

interface GastoCrudo {
  id: number;
  concepto: string;
  monto: number;
  fecha: Date;
  medioPago: string | null;
}

const ZONA_HORARIA = "America/Argentina/Buenos_Aires";

const nombreTrabajo = Prisma.sql`COALESCE(pr.nombre, NULLIF(TRIM(t.descripcion), ''), 'Sin descripción')`;

const grupoTrabajo = Prisma.sql`
  CASE
    WHEN t."productoId" IS NOT NULL THEN 'producto:' || t."productoId"::text
    ELSE 'descripcion:' || LOWER(TRIM(t.descripcion))
  END
`;

function filtroPeriodo(columna: Prisma.Sql, desde: string, hasta: string): Prisma.Sql {
  return Prisma.sql`
    ((${columna} AT TIME ZONE 'UTC') AT TIME ZONE ${ZONA_HORARIA}) >= ${desde}::date
    AND ((${columna} AT TIME ZONE 'UTC') AT TIME ZONE ${ZONA_HORARIA}) < (${hasta}::date + INTERVAL '1 day')
  `;
}

function baseTrabajos(
  desde: string,
  hasta: string,
  productoId?: number,
  q?: string,
): Prisma.Sql {
  const filtroProducto =
    productoId != null ? Prisma.sql`AND t."productoId" = ${productoId}` : Prisma.empty;
  const filtroQ = q
    ? Prisma.sql`AND ${nombreTrabajo} ILIKE ${`%${q}%`}`
    : Prisma.empty;

  return Prisma.sql`
    SELECT
      t."productoId" AS "productoId",
      (ARRAY_AGG(${nombreTrabajo} ORDER BY t.id ASC))[1] AS "producto",
      COALESCE(pr.unidad, 'u') AS "unidad",
      SUM(t.cantidad)::float8 AS "cantidad",
      SUM(t.cantidad * t."valorUnitario")::float8 AS "ingresos",
      SUM(t.cantidad * COALESCE(t."costoUnitario", 0))::float8 AS "costo",
      (
        SUM(t.cantidad * t."valorUnitario")
        - SUM(t.cantidad * COALESCE(t."costoUnitario", 0))
      )::float8 AS "ganancia",
      BOOL_AND(t."costoUnitario" IS NOT NULL) AS "costoCompleto",
      COUNT(*) FILTER (WHERE t."costoUnitario" IS NULL)::int AS "trabajosSinCosto"
    FROM "Pedido" p
    JOIN "Trabajo" t ON t."pedidoId" = p.id
    LEFT JOIN "Producto" pr ON pr.id = t."productoId"
    WHERE p.estado <> 'CANCELADO'
      AND ${filtroPeriodo(Prisma.sql`p.fecha`, desde, hasta)}
      ${filtroProducto}
      ${filtroQ}
    GROUP BY t."productoId", ${grupoTrabajo}, COALESCE(pr.unidad, 'u')
  `;
}

function mapearFilaVenta(fila: FilaVentaCruda): FilaVenta {
  const ingresos = Number(fila.ingresos);
  const ganancia = Number(fila.ganancia);
  return {
    productoId: fila.productoId ?? null,
    producto: fila.producto,
    unidad: fila.unidad,
    cantidad: Number(fila.cantidad),
    ingresos,
    costo: Number(fila.costo),
    ganancia,
    margen: margenSobreVenta(ganancia, ingresos),
    costoCompleto: Boolean(fila.costoCompleto),
    trabajosSinCosto: Number(fila.trabajosSinCosto ?? 0),
  };
}

async function totalesPeriodo(
  desde: string,
  hasta: string,
  productoId?: number,
  q?: string,
): Promise<TotalesPeriodo> {
  const filtroProducto =
    productoId != null ? Prisma.sql`AND t."productoId" = ${productoId}` : Prisma.empty;
  const filtroQ = q
    ? Prisma.sql`AND ${nombreTrabajo} ILIKE ${`%${q}%`}`
    : Prisma.empty;

  const filas = await prisma.$queryRaw<TotalesCrudos[]>(Prisma.sql`
    SELECT
      COALESCE(SUM(t.cantidad * t."valorUnitario"), 0)::float8 AS "ingresos",
      COALESCE(SUM(t.cantidad * COALESCE(t."costoUnitario", 0)), 0)::float8 AS "costo",
      COALESCE(
        SUM(t.cantidad * t."valorUnitario")
        - SUM(t.cantidad * COALESCE(t."costoUnitario", 0)),
        0
      )::float8 AS "ganancia",
      COUNT(DISTINCT p.id)::int AS "pedidos",
      COALESCE(BOOL_AND(t."costoUnitario" IS NOT NULL), true) AS "costoCompleto",
      COUNT(*) FILTER (WHERE t."costoUnitario" IS NULL)::int AS "trabajosSinCosto"
    FROM "Pedido" p
    JOIN "Trabajo" t ON t."pedidoId" = p.id
    LEFT JOIN "Producto" pr ON pr.id = t."productoId"
    WHERE p.estado <> 'CANCELADO'
      AND ${filtroPeriodo(Prisma.sql`p.fecha`, desde, hasta)}
      ${filtroProducto}
      ${filtroQ}
  `);

  const fila = filas[0];
  const ingresos = Number(fila?.ingresos ?? 0);
  const ganancia = Number(fila?.ganancia ?? 0);
  return {
    ingresos,
    costo: Number(fila?.costo ?? 0),
    ganancia,
    margen: margenSobreVenta(ganancia, ingresos),
    pedidos: Number(fila?.pedidos ?? 0),
    costoCompleto: fila?.costoCompleto ?? true,
    trabajosSinCosto: Number(fila?.trabajosSinCosto ?? 0),
  };
}

async function totalGastos(desde: string, hasta: string): Promise<number> {
  const filas = await prisma.$queryRaw<{ total: number }[]>(Prisma.sql`
    SELECT COALESCE(SUM(monto), 0)::float8 AS "total"
    FROM "Gasto"
    WHERE ${filtroPeriodo(Prisma.sql`fecha`, desde, hasta)}
  `);
  return Number(filas[0]?.total ?? 0);
}

async function totalCompras(desde: string, hasta: string): Promise<number> {
  const filas = await prisma.$queryRaw<{ total: number }[]>(Prisma.sql`
    SELECT COALESCE(SUM(cantidad * precio), 0)::float8 AS "total"
    FROM "Compra"
    WHERE ${filtroPeriodo(Prisma.sql`fecha`, desde, hasta)}
  `);
  return Number(filas[0]?.total ?? 0);
}

async function resumenBalance(desde: string, hasta: string): Promise<BalanceResumen> {
  const [trabajos, gastos, comprasInsumos] = await Promise.all([
    totalesPeriodo(desde, hasta),
    totalGastos(desde, hasta),
    totalCompras(desde, hasta),
  ]);

  return {
    ingresos: trabajos.ingresos,
    costoTrabajos: trabajos.costo,
    gananciaBruta: trabajos.ganancia,
    gastos,
    comprasInsumos,
    resultado: trabajos.ganancia - gastos,
    cajaEstimada: trabajos.ingresos - comprasInsumos - gastos,
    costoCompleto: trabajos.costoCompleto,
    trabajosSinCosto: trabajos.trabajosSinCosto,
  };
}

export const reporteRepository = {
  ventas: async (
    desde: string,
    hasta: string,
    productoId?: number,
    q?: string,
  ): Promise<FilaVenta[]> => {
    const filas = await prisma.$queryRaw<FilaVentaCruda[]>(Prisma.sql`
      WITH base AS (${baseTrabajos(desde, hasta, productoId, q)})
      SELECT * FROM base
      ORDER BY "ganancia" DESC, "producto" ASC
    `);
    return filas.map(mapearFilaVenta);
  },

  totalesPeriodo,

  ranking: async ({
    desde,
    hasta,
    q,
    orden,
    dir,
    page,
    pageSize,
    filtro,
  }: {
    desde: string;
    hasta: string;
    q?: string;
    orden: string;
    dir: "asc" | "desc";
    page: number;
    pageSize: number;
    filtro: "todos" | "sin-costo" | "margen-bajo" | "perdida";
  }): Promise<RankingResultado> => {
    const base = baseTrabajos(desde, hasta, undefined, q);
    const metricas = Prisma.sql`
      metricas AS (
        SELECT
          *,
          CASE WHEN "ingresos" > 0 THEN "ganancia" / "ingresos" * 100 END AS "margen",
          CASE WHEN "cantidad" > 0 THEN "ganancia" / "cantidad" END AS "gananciaUnidad"
        FROM base
      )
    `;

    const filtroSql =
      filtro === "sin-costo"
        ? Prisma.sql`WHERE "costo" <= 0`
        : filtro === "margen-bajo"
          ? Prisma.sql`WHERE "margen" < 20`
          : filtro === "perdida"
            ? Prisma.sql`WHERE "ganancia" < 0`
            : Prisma.empty;

    const columnasOrden: Record<string, Prisma.Sql> = {
      nombre: Prisma.sql`"producto"`,
      cantidad: Prisma.sql`"cantidad"`,
      ingresos: Prisma.sql`"ingresos"`,
      costo: Prisma.sql`"costo"`,
      ganancia: Prisma.sql`"ganancia"`,
      margen: Prisma.sql`"margen"`,
      gananciaUnidad: Prisma.sql`"gananciaUnidad"`,
      // El porcentaje se deriva de ganancia / total; el total es constante.
      porcentaje: Prisma.sql`"ganancia"`,
    };
    const ordenSql = columnasOrden[orden] ?? columnasOrden.ganancia;
    const dirSql = dir === "asc" ? Prisma.sql`ASC` : Prisma.sql`DESC`;
    const offset = (page - 1) * pageSize;

    const [filas, totales] = await Promise.all([
      prisma.$queryRaw<FilaRankingCruda[]>(Prisma.sql`
        WITH base AS (${base}),
        ${metricas},
        filtradas AS (
          SELECT * FROM metricas
          ${filtroSql}
        )
        SELECT * FROM filtradas
        ORDER BY ${ordenSql} ${dirSql} NULLS LAST, "producto" ASC, "productoId" ASC NULLS LAST
        LIMIT ${pageSize} OFFSET ${offset}
      `),
      prisma.$queryRaw<{ total: number; gananciaTotal: number }[]>(Prisma.sql`
        WITH base AS (${base}),
        ${metricas},
        filtradas AS (
          SELECT * FROM metricas
          ${filtroSql}
        )
        SELECT
          (SELECT COUNT(*) FROM filtradas)::int AS "total",
          (SELECT COALESCE(SUM("ganancia"), 0) FROM metricas)::float8 AS "gananciaTotal"
      `),
    ]);

    const total = Number(totales[0]?.total ?? 0);
    const gananciaTotal = Number(totales[0]?.gananciaTotal ?? 0);

    return {
      data: filas.map((fila) => {
        const venta = mapearFilaVenta(fila);
        return {
          ...venta,
          gananciaUnidad:
            fila.gananciaUnidad === null ? null : Number(fila.gananciaUnidad),
          porcentajeGanancia:
            gananciaTotal === 0 ? null : (venta.ganancia / gananciaTotal) * 100,
        };
      }),
      total,
      page,
      pageSize,
    };
  },

  balance: async (desde: string, hasta: string): Promise<BalanceResultado> => {
    const [actual, gastosPorCategoria, compras, gastos] = await Promise.all([
      resumenBalance(desde, hasta),
      prisma.$queryRaw<GastoPorCategoria[]>(Prisma.sql`
        SELECT
          concepto AS "categoria",
          SUM(monto)::float8 AS "monto"
        FROM "Gasto"
        WHERE ${filtroPeriodo(Prisma.sql`fecha`, desde, hasta)}
        GROUP BY concepto
        ORDER BY "monto" DESC, "categoria" ASC
      `),
      prisma.$queryRaw<CompraCruda[]>(Prisma.sql`
        SELECT
          c.id,
          c."insumoId",
          c.fecha,
          c.cantidad::float8 AS "cantidad",
          c.precio::float8 AS "precio",
          c."medioPago",
          i.nombre AS "insumoNombre",
          i.unidad AS "insumoUnidad"
        FROM "Compra" c
        JOIN "Insumo" i ON i.id = c."insumoId"
        WHERE ${filtroPeriodo(Prisma.sql`c.fecha`, desde, hasta)}
        ORDER BY c.fecha DESC, c.id DESC
      `),
      prisma.$queryRaw<GastoCrudo[]>(Prisma.sql`
        SELECT
          id,
          concepto,
          monto::float8 AS "monto",
          fecha,
          "medioPago"
        FROM "Gasto"
        WHERE ${filtroPeriodo(Prisma.sql`fecha`, desde, hasta)}
        ORDER BY fecha DESC, id DESC
      `),
    ]);

    return {
      actual,
      anterior: null,
      gastosPorCategoria: gastosPorCategoria.map((fila) => ({
        categoria: fila.categoria,
        monto: Number(fila.monto),
      })),
      compras: compras.map((fila) => ({
        id: fila.id,
        insumoId: fila.insumoId,
        fecha: fila.fecha.toISOString(),
        cantidad: Number(fila.cantidad),
        precio: Number(fila.precio),
        medioPago: fila.medioPago ?? null,
        insumo: { nombre: fila.insumoNombre, unidad: fila.insumoUnidad },
      })),
      gastos: gastos.map((fila) => ({
        id: fila.id,
        concepto: fila.concepto,
        monto: Number(fila.monto),
        fecha: fila.fecha.toISOString(),
        medioPago: fila.medioPago ?? null,
      })),
    };
  },

  resumenBalance,
};
