import { z } from "zod";

export const crearClienteSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  telefono: z.string().optional(),
  notas: z.string().optional(),
});

export const actualizarClienteSchema = crearClienteSchema.partial();
export type CrearClienteInput = z.infer<typeof crearClienteSchema>;
export type ActualizarClienteInput = z.infer<typeof actualizarClienteSchema>;
