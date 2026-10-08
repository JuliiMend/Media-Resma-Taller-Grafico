import { z } from "zod";

export const crearProductoSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  tipo: z.string().min(1, "El tipo es obligatorio"),
  descripcion: z.string().optional(),
  precioVenta: z.number().nonnegative().optional(),
  activo: z.boolean().default(true),
});

export const actualizarProductoSchema = crearProductoSchema.partial();
export type CrearProductoInput = z.infer<typeof crearProductoSchema>;
export type ActualizarProductoInput = z.infer<typeof actualizarProductoSchema>;
