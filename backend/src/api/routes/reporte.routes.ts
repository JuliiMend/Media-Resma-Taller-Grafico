import { Router } from "express";
import { reporteController } from "../controllers/reporte.controller";

export const reporteRouter = Router();

reporteRouter.get("/ventas", reporteController.ventas);
reporteRouter.get("/resumen", reporteController.resumen);
reporteRouter.get("/ranking", reporteController.ranking);
reporteRouter.get("/balance", reporteController.balance);
