import { productoInsumoRepository } from "../repositories/productoInsumo.repository";
import { CrearProductoInsumoInput, ActualizarProductoInsumoInput } from "../schemas/productoInsumo.schema";

export const productoInsumoService = {
  listar: () => productoInsumoRepository.findAll(),
  obtener: async (id: number) => {
    const receta = await productoInsumoRepository.findById(id);
    if (!receta) throw new Error("Relación producto-insumo no encontrada");
    return receta;
  },
  crear: (data: CrearProductoInsumoInput) => productoInsumoRepository.create(data),
  actualizar: (id: number, data: ActualizarProductoInsumoInput) =>
    productoInsumoRepository.update(id, data),
  eliminar: (id: number) => productoInsumoRepository.remove(id),
};
