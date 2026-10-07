import { Request, Response } from "express";
import { authService } from "../../services/auth.service";
import { asyncHandler } from "../../utils/asyncHandler";

export const login = asyncHandler(async (req: Request, res: Response) => {
    const resultado = await authService.login(req.body.email, req.body.password);
    res.json(resultado);
});

export const crearUsuario = asyncHandler(async (req: Request, res: Response) => {
    const usuario = await authService.crearUsuario(req.body);
    res.status(201).json(usuario);
});