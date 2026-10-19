import { Router } from "express";
import { reporteController } from "../controllers/reporte.controller";

export const reporteRouter = Router();

reporteRouter.get("/ventas", reporteController.ventas);
