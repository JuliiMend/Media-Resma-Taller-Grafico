import { tareaRepository } from "../repositories/tarea.repository";
import { ActualizarTareaInput, CrearTareaInput } from "../schemas/tarea.schema";

export const tareaService = {
  listar: () => tareaRepository.findAll(),
  obtener: async (id: number) => {
    const tarea = await tareaRepository.findById(id);
    if (!tarea) throw new Error("Tarea no encontrada");
    return tarea;
  },
  listarParaAlertas: (desde: Date, hasta: Date) => tareaRepository.findAlertas(desde, hasta),
  crear: (data: CrearTareaInput) => tareaRepository.create(data),
  actualizar: (id: number, data: ActualizarTareaInput) => tareaRepository.update(id, data),
  eliminar: (id: number) => tareaRepository.remove(id),
};
