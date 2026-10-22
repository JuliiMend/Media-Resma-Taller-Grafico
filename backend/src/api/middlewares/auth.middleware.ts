import { NextFunction, Request, Response } from "express";
import { verificarToken } from "../../utils/jwt";
import { HttpError } from "../../utils/http-error";
import { requestContext } from "../../utils/request-context";

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
    let usuarioId: number;
    try {
        const payload = verificarToken(header.replace("Bearer ", ""));
        usuarioId = payload.usuarioId;
    } catch {
        throw new HttpError(401, "Token inválido o vencido");
    }
    req.usuarioId = usuarioId;
    requestContext.run({ usuarioId }, next);
}
