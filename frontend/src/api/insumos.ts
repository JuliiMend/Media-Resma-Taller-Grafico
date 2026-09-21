import { api } from "./client";
import { Insumo, CrearInsumoInput } from "../../../../Media Resma Taller Grafico/frontend/src/types/insumo";

export const insumosApi = {
  listar: () => api.get<Insumo[]>("/insumos").then((r) => r.data),
  obtener: (id: number) => api.get<Insumo>(`/insumos/${id}`).then((r) => r.data),
  crear: (data: CrearInsumoInput) => api.post<Insumo>("/insumos", data).then((r) => r.data),
  actualizar: (id: number, data: Partial<CrearInsumoInput>) =>
    api.patch<Insumo>(`/insumos/${id}`, data).then((r) => r.data),
  eliminar: (id: number) => api.delete(`/insumos/${id}`),
};
