import { z } from "zod";

export const crearHistorialSchema = z.object({
  fecha: z.coerce.date().optional(),
  accion: z.string().min(1, "La acción es obligatoria"),
  entidad: z.string().min(1, "La entidad es obligatoria"),
  entidadId: z.number().int().positive(),
  detalle: z.string().min(1, "El detalle es obligatorio"),
  usuarioId: z.number().int().positive(),
});

export const actualizarHistorialSchema = crearHistorialSchema.partial();
export type CrearHistorialInput = z.infer<typeof crearHistorialSchema>;
export type ActualizarHistorialInput = z.infer<typeof actualizarHistorialSchema>;
