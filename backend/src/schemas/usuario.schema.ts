import { z } from "zod";

export const crearUsuarioSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  activo: z.boolean().default(true),
});

export const actualizarUsuarioSchema = crearUsuarioSchema.partial();

export type CrearUsuarioInput = z.infer<typeof crearUsuarioSchema>;
export type ActualizarUsuarioInput = z.infer<typeof actualizarUsuarioSchema>;
