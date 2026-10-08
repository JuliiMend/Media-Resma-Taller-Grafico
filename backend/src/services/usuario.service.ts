import { usuarioRepository } from "../repositories/usuario.repository";
import { CrearUsuarioInput, ActualizarUsuarioInput } from "../schemas/usuario.schema";

export const usuarioService = {
  listar: () => usuarioRepository.findAll(),
  obtener: async (id: number) => {
    const usuario = await usuarioRepository.findById(id);
    if (!usuario) throw new Error("Usuario no encontrado");
    return usuario;
  },
  crear: (data: CrearUsuarioInput) => usuarioRepository.create(data),
  actualizar: (id: number, data: ActualizarUsuarioInput) =>
    usuarioRepository.update(id, data),
  eliminar: (id: number) => usuarioRepository.remove(id),
};
