import { createCrudController } from "./crud.controller";
import { historialService } from "../../services/historial.service";
import { crearHistorialSchema, actualizarHistorialSchema } from "../../schemas/historial.schema";

export const historialController = createCrudController(
  historialService,
  crearHistorialSchema,
  actualizarHistorialSchema
);
