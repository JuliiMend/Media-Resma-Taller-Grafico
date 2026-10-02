import { z } from "zod";

export const crearTareaSchema = z.object({
  titulo: z.string().min(1, "El título es obligatorio"),
  descripcion: z.string().optional(),
  estado: z.string().min(1).default("PENDIENTE"),
  fechaLimite: z.coerce.date().nullable().optional(),
  usuarioId: z.number().int().positive().nullable().optional(),
  pedidoId: z.number().int().positive().nullable().optional(),
});

export const actualizarTareaSchema = crearTareaSchema.partial();
export type CrearTareaInput = z.infer<typeof crearTareaSchema>;
export type ActualizarTareaInput = z.infer<typeof actualizarTareaSchema>;
