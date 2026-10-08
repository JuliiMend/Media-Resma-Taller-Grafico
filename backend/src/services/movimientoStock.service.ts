import { movimientoStockRepository } from "../repositories/movimientoStock.repository";
import { CrearMovimientoStockInput, ActualizarMovimientoStockInput } from "../schemas/movimientoStock.schema";

export const movimientoStockService = {
  listar: () => movimientoStockRepository.findAll(),
  obtener: async (id: number) => {
    const movimiento = await movimientoStockRepository.findById(id);
    if (!movimiento) throw new Error("Movimiento de stock no encontrado");
    return movimiento;
  },
  crear: (data: CrearMovimientoStockInput) => movimientoStockRepository.create(data),
  actualizar: (id: number, data: ActualizarMovimientoStockInput) =>
    movimientoStockRepository.update(id, data),
  eliminar: (id: number) => movimientoStockRepository.remove(id),
};
