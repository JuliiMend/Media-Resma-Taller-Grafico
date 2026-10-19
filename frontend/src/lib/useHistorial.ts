import { useCallback } from "react";
import { useSWRConfig } from "swr";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";

export type AccionHistorial = "CREAR" | "EDITAR" | "ELIMINAR" | "COMPLETAR" | "REABRIR" | "CAMBIO_ESTADO";

// The backend does not write to /historial on its own, so each screen records its actions.
// Logging is best-effort: a failure here must never break the action that was already saved.
export function useRegistrarHistorial() {
  const { user } = useAuth();
  const { mutate } = useSWRConfig();

  return useCallback(
    async (accion: AccionHistorial, entidad: string, entidadId: number | undefined, detalle: string) => {
      if (!user || !entidadId || entidadId < 1) return;
      try {
        await api.post("/historial", { accion, entidad, entidadId, detalle, usuarioId: user.id });
        await mutate("/historial");
      } catch {
        // intentionally ignored
      }
    },
    [user, mutate],
  );
}
