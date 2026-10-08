import { clienteRepository } from "../repositories/cliente.repository";
import { CrearClienteInput, ActualizarClienteInput } from "../schemas/cliente.schema";

export const clienteService = {
  listar: () => clienteRepository.findAll(),
  obtener: async (id: number) => {
    const cliente = await clienteRepository.findById(id);
    if (!cliente) throw new Error("Cliente no encontrado");
    return cliente;
  },
  crear: (data: CrearClienteInput) => clienteRepository.create(data),
  actualizar: (id: number, data: ActualizarClienteInput) =>
    clienteRepository.update(id, data),
  eliminar: (id: number) => clienteRepository.remove(id),
};
