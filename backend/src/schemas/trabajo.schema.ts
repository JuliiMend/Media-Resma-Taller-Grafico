import { z } from "zod";

export const crearTrabajoSchema = z.object({
  pedidoId: z.number().int().positive(),
  productoId: z.number().int().positive().nullable().optional(),
  descripcion: z.string().min(1, "La descripción es obligatoria"),
  cantidad: z.number().positive().default(1),
  valorUnitario: z.number().nonnegative(),
  estadoProducto: z.string().optional(),
});

export const actualizarTrabajoSchema = crearTrabajoSchema.partial();
export type CrearTrabajoInput = z.infer<typeof crearTrabajoSchema>;
export type ActualizarTrabajoInput = z.infer<typeof actualizarTrabajoSchema>;
