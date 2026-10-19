import { z } from "zod";
import { crearTrabajoSinPedidoSchema } from "./trabajo.schema";

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
  trabajos: z.array(crearTrabajoSinPedidoSchema).optional(),
});

export const actualizarPedidoSchema = crearPedidoSchema.partial().omit({ trabajos: true });
export type CrearPedidoInput = z.infer<typeof crearPedidoSchema>;
export type ActualizarPedidoInput = z.infer<typeof actualizarPedidoSchema>;

export const pagoPedidoSchema = z.object({
  monto: z.number().positive().optional(),
});
export type PagoPedidoInput = z.infer<typeof pagoPedidoSchema>;
