import { insumoRepository } from "../repositories/insumo.repository";
import { CrearInsumoInput, ActualizarInsumoInput } from "../schemas/insumo.schema";

export const insumoService = {
  listar: () => insumoRepository.findAll(),

  obtener: async (id: number) => {
    const insumo = await insumoRepository.findById(id);
    if (!insumo) throw new Error("Insumo no encontrado");
    return insumo;
  },

  crear: (data: CrearInsumoInput) => insumoRepository.create(data),

  actualizar: (id: number, data: ActualizarInsumoInput) =>
    insumoRepository.update(id, data),

  eliminar: (id: number) => insumoRepository.remove(id),

  listarConStockBajo: () => insumoRepository.findConStockBajo(),
};
