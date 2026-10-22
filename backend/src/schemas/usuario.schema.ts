import { z } from "zod";

export const crearUsuarioSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  activo: z.boolean().default(true),
  email: z.string().email("El email no es válido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  fotoPerfil: z.string().max(5_000_000, "La foto es demasiado grande").nullable().optional(),
});

export const actualizarUsuarioSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio").optional(),
  activo: z.boolean().optional(),
  email: z.string().email("El email no es válido").optional(),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").optional(),
  fotoPerfil: z.string().max(5_000_000, "La foto es demasiado grande").nullable().optional(),
});

export type CrearUsuarioInput = z.infer<typeof crearUsuarioSchema>;
export type ActualizarUsuarioInput = z.infer<typeof actualizarUsuarioSchema>;
