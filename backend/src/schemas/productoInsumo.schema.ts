import { z } from "zod";

export const crearProductoInsumoSchema = z.object({
  productoId: z.number().int().positive(),
  insumoId: z.number().int().positive(),
  cantidadPorUnidad: z.number().nonnegative(),
});

export const actualizarProductoInsumoSchema = crearProductoInsumoSchema.partial();
export type CrearProductoInsumoInput = z.infer<typeof crearProductoInsumoSchema>;
export type ActualizarProductoInsumoInput = z.infer<typeof actualizarProductoInsumoSchema>;
