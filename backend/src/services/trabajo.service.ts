import { trabajoRepository } from "../repositories/trabajo.repository";
import { CrearTrabajoInput, ActualizarTrabajoInput } from "../schemas/trabajo.schema";

export const trabajoService = {
  listar: () => trabajoRepository.findAll(),
  obtener: async (id: number) => {
    const trabajo = await trabajoRepository.findById(id);
    if (!trabajo) throw new Error("Trabajo no encontrado");
    return trabajo;
  },
  crear: (data: CrearTrabajoInput) => trabajoRepository.create(data),
  actualizar: (id: number, data: ActualizarTrabajoInput) =>
    trabajoRepository.update(id, data),
  eliminar: (id: number) => trabajoRepository.remove(id),
};
