import { createCrudController } from "./crud.controller";
import { gastoService } from "../../services/gasto.service";
import { crearGastoSchema, actualizarGastoSchema } from "../../schemas/gasto.schema";

export const gastoController = createCrudController(gastoService, crearGastoSchema, actualizarGastoSchema);
