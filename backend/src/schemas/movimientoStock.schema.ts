import { z } from "zod";

export const crearMovimientoStockSchema = z.object({
  insumoId: z.number().int().positive(),
  trabajoId: z.number().int().positive().nullable().optional(),
  tipo: z.string().min(1, "El tipo es obligatorio"),
  cantidad: z.number().positive(),
  fecha: z.coerce.date().optional(),
});

export const actualizarMovimientoStockSchema = crearMovimientoStockSchema.partial();
export type CrearMovimientoStockInput = z.infer<typeof crearMovimientoStockSchema>;
export type ActualizarMovimientoStockInput = z.infer<typeof actualizarMovimientoStockSchema>;
