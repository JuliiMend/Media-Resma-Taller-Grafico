import { z } from "zod";

export const crearHistorialSchema = z.object({
  fecha: z.coerce.date().optional(),
  accion: z.string().min(1, "La acción es obligatoria"),
  entidad: z.string().min(1, "La entidad es obligatoria"),
  entidadId: z.number().int().positive(),
  detalle: z.string().min(1, "El detalle es obligatorio"),
});

export const actualizarHistorialSchema = crearHistorialSchema.partial();
export type CrearHistorialInput = z.infer<typeof crearHistorialSchema>;
export type ActualizarHistorialInput = z.infer<typeof actualizarHistorialSchema>;
export type NuevoHistorialInput = CrearHistorialInput & { usuarioId: number };

const fechaFiltro = (finDelDia: boolean) =>
  z
    .union([z.string(), z.date()])
    .optional()
    .transform((valor, ctx) => {
      if (valor === undefined || valor === "") return undefined;
      if (valor instanceof Date) return valor;
      const soloFecha = /^\d{4}-\d{2}-\d{2}$/.test(valor);
      const fecha = new Date(
        soloFecha ? `${valor}T${finDelDia ? "23:59:59.999" : "00:00:00.000"}-03:00` : valor
      );
      if (Number.isNaN(fecha.getTime())) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Fecha inválida" });
        return z.NEVER;
      }
      return fecha;
    });

export const filtrosHistorialSchema = z.object({
  entidad: z.string().min(1).optional(),
  entidadId: z.coerce.number().int().positive().optional(),
  usuarioId: z.coerce.number().int().positive().optional(),
  desde: fechaFiltro(false),
  hasta: fechaFiltro(true),
});

export type FiltrosHistorial = z.infer<typeof filtrosHistorialSchema>;
