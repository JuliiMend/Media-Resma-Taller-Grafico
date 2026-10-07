import { Router } from "express";
import { login, crearUsuario } from "../controllers/auth.controller";
import { validate } from "../middlewares/validate.middleware";
import { loginSchema, crearUsuarioSchema } from "../../schemas/auth.schema";
import { requireAuth } from "../middlewares/auth.middleware";

export const authRouter = Router();

authRouter.post("/login", validate(loginSchema), login);
authRouter.post("/usuarios", requireAuth, validate(crearUsuarioSchema), crearUsuario);