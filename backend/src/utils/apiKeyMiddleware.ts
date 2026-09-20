import { NextFunction, Request, Response } from "express";
import { env } from "../config/env";

// Middleware opcional: solo lo activás en las rutas que quieras
// proteger cuando expongas el server fuera de localhost (Tailscale, etc).
// Mientras trabajes en localhost, no hace falta usarlo.
export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  if (!env.apiKey) return next(); // si no configuraste API_KEY, no bloquea nada
  const key = req.header("x-api-key");
  if (key !== env.apiKey) {
    return res.status(401).json({ error: "API key inválida o faltante" });
  }
  next();
}
