import { createCrudController } from "./crud.controller";
import { productoService } from "../../services/producto.service";
import { crearProductoSchema, actualizarProductoSchema } from "../../schemas/producto.schema";

export const productoController = createCrudController(productoService, crearProductoSchema, actualizarProductoSchema);
