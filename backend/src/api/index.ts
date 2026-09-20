import { Router } from "express";
import { insumoRouter } from "./insumo.routes";
// A medida que armes los CRUDs de Cliente, Producto y Pedido,
// creá su archivo <entidad>.routes.ts siguiendo el mismo patrón
// que insumo.routes.ts, y montalo acá abajo.

export const apiRouter = Router();

apiRouter.use("/insumos", insumoRouter);
