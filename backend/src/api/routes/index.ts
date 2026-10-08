import { Router } from "express";
import { authRouter } from "./auth.routes";
import { requireAuth } from "../middlewares/auth.middleware";

import { insumoRouter } from "./insumo.routes";
import { usuarioRouter } from "./usuario.routes";
import { clienteRouter } from "./cliente.routes";
import { productoRouter } from "./producto.routes";
import { productoInsumoRouter } from "./productoInsumo.routes";
import { pedidoRouter } from "./pedido.routes";
import { trabajoRouter } from "./trabajo.routes";
import { compraRouter } from "./compra.routes";
import { movimientoStockRouter } from "./movimientoStock.routes";
import { tareaRouter } from "./tarea.routes";
import { gastoRouter } from "./gasto.routes";
import { historialRouter } from "./historial.routes";
import { alertaRouter } from "./alerta.routes";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);

// Todo lo demás pasa por requireAuth antes de llegar a su router
apiRouter.use("/insumos", requireAuth, insumoRouter);
apiRouter.use("/usuarios", requireAuth, usuarioRouter);
apiRouter.use("/clientes", requireAuth, clienteRouter);
apiRouter.use("/productos", requireAuth, productoRouter);
apiRouter.use("/productos-insumos", requireAuth, productoInsumoRouter);
apiRouter.use("/pedidos", requireAuth, pedidoRouter);
apiRouter.use("/trabajos", requireAuth, trabajoRouter);
apiRouter.use("/compras", requireAuth, compraRouter);
apiRouter.use("/movimientos-stock", requireAuth, movimientoStockRouter);
apiRouter.use("/tareas", requireAuth, tareaRouter);
apiRouter.use("/gastos", requireAuth, gastoRouter);
apiRouter.use("/historial", requireAuth, historialRouter);
apiRouter.use("/alertas", requireAuth, alertaRouter);