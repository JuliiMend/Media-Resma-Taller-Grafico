import { historialRepository } from "../repositories/historial.repository";
import {
  ActualizarHistorialInput,
  CrearHistorialInput,
  FiltrosHistorial,
} from "../schemas/historial.schema";
import { HttpError } from "../utils/http-error";
import { getUsuarioId } from "../utils/request-context";

export const historialService = {
  listar: (filtros: FiltrosHistorial = {}) => historialRepository.findAll(filtros),
  obtener: async (id: number) => {
    const historial = await historialRepository.findById(id);
    if (!historial) throw new Error("Historial no encontrado");
    return historial;
  },
  crear: (data: CrearHistorialInput) => {
    const usuarioId = getUsuarioId();
    if (!usuarioId) throw new HttpError(401, "No autenticado");
    return historialRepository.create({ ...data, usuarioId });
  },
  actualizar: (id: number, data: ActualizarHistorialInput) =>
    historialRepository.update(id, data),
  eliminar: (id: number) => historialRepository.remove(id),
};
