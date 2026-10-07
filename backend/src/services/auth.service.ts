import { prisma } from "../config/prisma";
import { hashPassword, compararPassword } from "../utils/password";
import { generarToken } from "../utils/jwt";
import { HttpError } from "../utils/http-error";

export const authService = {
    login: async (email: string, password: string) => {
        const usuario = await prisma.usuario.findUnique({ where: { email } });
        if (!usuario || !usuario.activo) throw new HttpError(401, "Credenciales inválidas");

        const esValida = await compararPassword(password, usuario.passwordHash);
        if (!esValida) throw new HttpError(401, "Credenciales inválidas");

        const token = generarToken({ usuarioId: usuario.id });
        return { token, usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email } };
    },


    crearUsuario: async (data: { nombre: string; email: string; password: string }) => {
        const passwordHash = await hashPassword(data.password);
        const usuario = await prisma.usuario.create({
            data: { nombre: data.nombre, email: data.email, passwordHash },
        });
        return { id: usuario.id, nombre: usuario.nombre, email: usuario.email };
    },
};