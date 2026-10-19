import { prisma } from "../config/db";
import { HttpError } from "../utils/http-error";
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

  eliminar: async (id: number) => {
    const trabajosAsociados = await prisma.trabajo.count({
      where: { productoId: id },
    });

    if (trabajosAsociados > 0) {
      throw new HttpError(
        409,
        "No se puede borrar porque tiene registros asociados. Archivalo en su lugar.",
        "TIENE_RELACIONES"
      );
    }

    return productoRepository.remove(id);
  },
};
