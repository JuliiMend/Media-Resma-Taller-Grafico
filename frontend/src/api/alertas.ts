import { api } from "../../../../Media Resma Taller Grafico/frontend/src/api/client";

export const alertasApi = {
  chequear: () => api.get<{ avisos: number }>("/alertas/chequear").then((r) => r.data),
};
