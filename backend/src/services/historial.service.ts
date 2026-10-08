import { historialRepository } from "../repositories/historial.repository";
import { ActualizarHistorialInput, CrearHistorialInput } from "../schemas/historial.schema";

export const historialService = {
  listar: () => historialRepository.findAll(),
  obtener: async (id: number) => {
    const historial = await historialRepository.findById(id);
    if (!historial) throw new Error("Historial no encontrado");
    return historial;
  },
  crear: (data: CrearHistorialInput) => historialRepository.create(data),
  actualizar: (id: number, data: ActualizarHistorialInput) =>
    historialRepository.update(id, data),
  eliminar: (id: number) => historialRepository.remove(id),
};
