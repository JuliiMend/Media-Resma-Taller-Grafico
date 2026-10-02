import { z } from "zod";

export const crearCompraSchema = z.object({
  insumoId: z.number().int().positive(),
  fecha: z.coerce.date().optional(),
  cantidad: z.number().positive(),
  precio: z.number().nonnegative(),
  medioPago: z.string().optional(),
});

export const actualizarCompraSchema = crearCompraSchema.partial();
export type CrearCompraInput = z.infer<typeof crearCompraSchema>;
export type ActualizarCompraInput = z.infer<typeof actualizarCompraSchema>;
