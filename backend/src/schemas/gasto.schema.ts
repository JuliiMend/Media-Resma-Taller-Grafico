import { z } from "zod";

export const crearGastoSchema = z.object({
  concepto: z.string().min(1, "El concepto es obligatorio"),
  monto: z.number().nonnegative(),
  fecha: z.coerce.date().optional(),
  medioPago: z.string().optional(),
});

export const actualizarGastoSchema = crearGastoSchema.partial();
export type CrearGastoInput = z.infer<typeof crearGastoSchema>;
export type ActualizarGastoInput = z.infer<typeof actualizarGastoSchema>;
