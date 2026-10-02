import { z } from "zod";

export const crearPedidoSchema = z.object({
  clienteId: z.number().int().positive(),
  usuarioId: z.number().int().positive().nullable().optional(),
  fecha: z.coerce.date().optional(),
  estado: z.string().min(1, "El estado es obligatorio"),
  sena: z.number().nonnegative().nullable().optional(),
  restaPagar: z.number().nonnegative().nullable().optional(),
  medioPago: z.string().optional(),
  fechaEntrega: z.coerce.date().optional(),
  envio: z.number().nonnegative().nullable().optional(),
  observaciones: z.string().optional(),
});

export const actualizarPedidoSchema = crearPedidoSchema.partial();
export type CrearPedidoInput = z.infer<typeof crearPedidoSchema>;
export type ActualizarPedidoInput = z.infer<typeof actualizarPedidoSchema>;
