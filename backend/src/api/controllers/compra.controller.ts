import { createCrudController } from "./crud.controller";
import { compraService } from "../../services/compra.service";
import { crearCompraSchema, actualizarCompraSchema } from "../../schemas/compra.schema";

export const compraController = createCrudController(compraService, crearCompraSchema, actualizarCompraSchema);
