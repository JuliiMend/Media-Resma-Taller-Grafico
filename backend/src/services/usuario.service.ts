import { usuarioRepository } from "../repositories/usuario.repository";
import { CrearUsuarioInput, ActualizarUsuarioInput } from "../schemas/usuario.schema";
import { hashPassword } from "../utils/password";

export const usuarioService = {
  listar: () => usuarioRepository.findAll(),

  obtener: async (id: number) => {
    const usuario = await usuarioRepository.findById(id);
    if (!usuario) throw new Error("Usuario no encontrado");
    return usuario;
  },

  crear: async (data: CrearUsuarioInput) => {
    const { password, ...resto } = data as any;
    const passwordHash = await hashPassword(password);
    return usuarioRepository.create({ ...resto, passwordHash } as any);
  },

  actualizar: async (id: number, data: ActualizarUsuarioInput) => {
    const { password, ...resto } = data as any;
    const update: any = { ...resto };
    if (password) {
      update.passwordHash = await hashPassword(password);
    }
    return usuarioRepository.update(id, update as any);
  },

  eliminar: (id: number) => usuarioRepository.remove(id),
};