import { Router } from "express";
import { chequearAlertas, estadoAlertas, probarAlertas } from "../controllers/alerta.controller";

export const alertaRouter = Router();
alertaRouter.post("/chequear", chequearAlertas);
alertaRouter.post("/probar", probarAlertas);
alertaRouter.get("/estado", estadoAlertas);
