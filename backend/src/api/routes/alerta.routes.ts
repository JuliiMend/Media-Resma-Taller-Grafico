import { Router } from "express";
import { chequearAlertas } from "../controllers/alerta.controller";

export const alertaRouter = Router();

alertaRouter.get("/chequear", chequearAlertas);
