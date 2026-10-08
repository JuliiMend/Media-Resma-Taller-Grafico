import { createCrudController } from "./crud.controller";
import { movimientoStockService } from "../../services/movimientoStock.service";
import { crearMovimientoStockSchema, actualizarMovimientoStockSchema } from "../../schemas/movimientoStock.schema";

export const movimientoStockController = createCrudController(
  movimientoStockService,
  crearMovimientoStockSchema,
  actualizarMovimientoStockSchema
);
