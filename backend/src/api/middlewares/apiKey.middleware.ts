import { NextFunction, Request, Response } from "express";
import { env } from "../../config/env";

export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  if (!env.apiKey) return next();
  const key = req.header("x-api-key");
  if (key !== env.apiKey) {
    return res.status(401).json({ error: "API key inválida o faltante" });
  }
  next();
}
