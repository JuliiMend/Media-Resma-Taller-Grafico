import { createCrudController } from "./crud.controller";
import { trabajoService } from "../../services/trabajo.service";
import { crearTrabajoSchema, actualizarTrabajoSchema } from "../../schemas/trabajo.schema";

export const trabajoController = createCrudController(trabajoService, crearTrabajoSchema, actualizarTrabajoSchema);
