import { createCrudController } from "./crud.controller";
import { tareaService } from "../../services/tarea.service";
import { crearTareaSchema, actualizarTareaSchema } from "../../schemas/tarea.schema";

export const tareaController = createCrudController(tareaService, crearTareaSchema, actualizarTareaSchema);
