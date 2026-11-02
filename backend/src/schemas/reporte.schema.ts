import { z } from "zod";

const fechaYYYYMMDD = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "El formato de fecha debe ser YYYY-MM-DD");

const rangoValido = <T extends { desde?: string; hasta?: string }>(data: T) =>
  !data.desde || !data.hasta || data.desde <= data.hasta;

const mensajeRango = {
  message: "La fecha desde no puede ser posterior a la fecha hasta",
  path: ["desde"],
};

const reporteBaseSchema = z.object({
  desde: fechaYYYYMMDD.optional(),
  hasta: fechaYYYYMMDD.optional(),
  productoId: z.coerce.number().int().positive().optional(),
  q: z.string().trim().min(1).max(100).optional(),
});

export const ventasQuerySchema = reporteBaseSchema.refine(rangoValido, mensajeRango);

export const resumenQuerySchema = reporteBaseSchema
  .extend({
    comparar: z
      .enum(["0", "1"])
      .optional()
      .transform((valor) => valor !== "0"),
  })
  .refine(rangoValido, mensajeRango);

export const rankingQuerySchema = z
  .object({
    desde: fechaYYYYMMDD.optional(),
    hasta: fechaYYYYMMDD.optional(),
    q: z.string().trim().min(1).max(100).optional(),
    orden: z
      .enum([
        "nombre",
        "cantidad",
        "ingresos",
        "costo",
        "ganancia",
        "margen",
        "gananciaUnidad",
        "porcentaje",
      ])
      .default("ganancia"),
    dir: z.enum(["asc", "desc"]).default("desc"),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
    filtro: z.enum(["todos", "sin-costo", "margen-bajo", "perdida"]).default("todos"),
  })
  .refine(rangoValido, mensajeRango);

export const balanceQuerySchema = z
  .object({
    desde: fechaYYYYMMDD.optional(),
    hasta: fechaYYYYMMDD.optional(),
  })
  .refine(rangoValido, mensajeRango);

export type VentasQueryInput = z.infer<typeof ventasQuerySchema>;
export type ResumenQueryInput = z.infer<typeof resumenQuerySchema>;
export type RankingQueryInput = z.infer<typeof rankingQuerySchema>;
export type BalanceQueryInput = z.infer<typeof balanceQuerySchema>;
