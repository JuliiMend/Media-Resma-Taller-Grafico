import { createCrudController } from "./crud.controller";
import { productoInsumoService } from "../../services/productoInsumo.service";
import { crearProductoInsumoSchema, actualizarProductoInsumoSchema } from "../../schemas/productoInsumo.schema";

export const productoInsumoController = createCrudController(
  productoInsumoService,
  crearProductoInsumoSchema,
  actualizarProductoInsumoSchema
);
