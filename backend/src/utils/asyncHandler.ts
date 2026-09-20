import { NextFunction, Request, Response } from "express";

// Envuelve un handler async para que los errores lleguen
// al middleware de manejo de errores en vez de colgar el request.
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
