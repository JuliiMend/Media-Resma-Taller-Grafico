import { gastoRepository } from "../repositories/gasto.repository";
import { ActualizarGastoInput, CrearGastoInput } from "../schemas/gasto.schema";

export const gastoService = {
  listar: () => gastoRepository.findAll(),
  obtener: async (id: number) => {
    const gasto = await gastoRepository.findById(id);
    if (!gasto) throw new Error("Gasto no encontrado");
    return gasto;
  },
  crear: (data: CrearGastoInput) => gastoRepository.create(data),
  actualizar: (id: number, data: ActualizarGastoInput) => gastoRepository.update(id, data),
  eliminar: (id: number) => gastoRepository.remove(id),
};
