import { z } from "zod";

export const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, "El id debe ser numérico"),
});
