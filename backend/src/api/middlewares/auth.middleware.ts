import { NextFunction, Request, Response } from "express";
import { verificarToken } from "../../utils/jwt";
import { HttpError } from "../../utils/http-error";

declare global {
    namespace Express {
        interface Request {
            usuarioId?: number;
        }
    }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
    const header = req.header("authorization");
    if (!header?.startsWith("Bearer ")) {
        throw new HttpError(401, "No autenticado");
    }
    try {
        const payload = verificarToken(header.replace("Bearer ", ""));
        req.usuarioId = payload.usuarioId;
        next();
    } catch {
        throw new HttpError(401, "Token inválido o vencido");
    }
}