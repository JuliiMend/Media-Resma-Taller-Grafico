import { z } from "zod";

export const crearUsuarioSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  activo: z.boolean().default(true),
  email: z.string().email("El email no es válido"),
  passwordHash: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export const actualizarUsuarioSchema = crearUsuarioSchema.partial();

export type CrearUsuarioInput = z.infer<typeof crearUsuarioSchema>;
export type ActualizarUsuarioInput = z.infer<typeof actualizarUsuarioSchema>;
