import { compraRepository } from "../repositories/compra.repository";
import { CrearCompraInput, ActualizarCompraInput } from "../schemas/compra.schema";

export const compraService = {
  listar: () => compraRepository.findAll(),
  obtener: async (id: number) => {
    const compra = await compraRepository.findById(id);
    if (!compra) throw new Error("Compra no encontrada");
    return compra;
  },
  crear: (data: CrearCompraInput) => compraRepository.create(data),
  actualizar: (id: number, data: ActualizarCompraInput) =>
    compraRepository.update(id, data),
  eliminar: (id: number) => compraRepository.remove(id),
};
