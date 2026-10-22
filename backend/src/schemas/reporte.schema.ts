import { z } from "zod";

const fechaYYYYMMDD = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "El formato de fecha debe ser YYYY-MM-DD");

export const ventasQuerySchema = z.object({
  desde: fechaYYYYMMDD.optional(),
  hasta: fechaYYYYMMDD.optional(),
  productoId: z.coerce.number().int().positive().optional(),
  q: z.string().trim().min(1).max(100).optional(),
});

export type VentasQueryInput = z.infer<typeof ventasQuerySchema>;
