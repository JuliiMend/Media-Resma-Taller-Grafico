import jwt from "jsonwebtoken";
import { env } from "@/config/env";

export interface JwtPayload {
    usuarioId: number;
}

export const generarToken = (payload: JwtPayload) =>
    jwt.sign(payload, env.jwtSecret, { expiresIn: "7d" });

export const verificarToken = (token: string): JwtPayload =>
    jwt.verify(token, env.jwtSecret) as JwtPayload;