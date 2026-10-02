import { pedidoRepository } from "../repositories/pedido.repository";
import { CrearPedidoInput, ActualizarPedidoInput } from "../schemas/pedido.schema";


export const pedidoService = {
  listar: () => pedidoRepository.findAll(),
  obtener: async (id: number) => {
    const pedido = await pedidoRepository.findById(id);
    if (!pedido) throw new Error("Pedido no encontrado");
    return pedido;
  },
  listarConSaldo: () => pedidoRepository.findConSaldo(),
  crear: (data: CrearPedidoInput) => pedidoRepository.create(data),
  actualizar: (id: number, data: ActualizarPedidoInput) =>
    pedidoRepository.update(id, data),
  eliminar: (id: number) => pedidoRepository.remove(id),
  listarProximosAEntregar: async (desde: Date, hasta: Date) => {
    return pedidoRepository.findProximosAEntregar(desde, hasta);
  },
};
