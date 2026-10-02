import { productoRepository } from "../repositories/producto.repository";
import { CrearProductoInput, ActualizarProductoInput } from "../schemas/producto.schema";

export const productoService = {
  listar: () => productoRepository.findAll(),
  obtener: async (id: number) => {
    const producto = await productoRepository.findById(id);
    if (!producto) throw new Error("Producto no encontrado");
    return producto;
  },
  crear: (data: CrearProductoInput) => productoRepository.create(data),
  actualizar: (id: number, data: ActualizarProductoInput) =>
    productoRepository.update(id, data),
  eliminar: (id: number) => productoRepository.remove(id),
};
