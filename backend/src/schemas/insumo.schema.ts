import { z } from "zod";

// Lo que se puede mandar al crear un insumo
export const crearInsumoSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  unidad: z.string().min(1, "La unidad es obligatoria"), // ej: "m", "u", "kg", "l"
  stockActual: z.number().nonnegative().default(0),
  stockMinimo: z.number().nonnegative().default(0),
  precioUnitario: z.number().nonnegative().default(0),
  proveedor: z.string().optional(),
});

// Al actualizar, todos los campos son opcionales
export const actualizarInsumoSchema = crearInsumoSchema.partial();

export type CrearInsumoInput = z.infer<typeof crearInsumoSchema>;
export type ActualizarInsumoInput = z.infer<typeof actualizarInsumoSchema>;
