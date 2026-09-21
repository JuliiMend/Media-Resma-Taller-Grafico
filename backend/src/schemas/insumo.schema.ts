import { z } from "zod";

export const crearInsumoSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  unidad: z.string().min(1, "La unidad es obligatoria"),
  stockActual: z.number().nonnegative().default(0),
  stockMinimo: z.number().nonnegative().default(0),
  precioUnitario: z.number().nonnegative().default(0),
  proveedor: z.string().optional(),
});

export const actualizarInsumoSchema = crearInsumoSchema.partial();

export type CrearInsumoInput = z.infer<typeof crearInsumoSchema>;
export type ActualizarInsumoInput = z.infer<typeof actualizarInsumoSchema>;
