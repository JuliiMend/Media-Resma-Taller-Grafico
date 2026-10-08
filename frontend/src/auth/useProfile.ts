import { useMemo } from "react";
import useSWR from "swr";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import type { Usuario } from "@/types";

async function fetchProfile(url: string): Promise<Usuario> {
  const { data } = await api.get<Usuario>(url);
  return { id: data.id, nombre: data.nombre, email: data.email, fotoPerfil: data.fotoPerfil ?? null, activo: data.activo };
}

export function useProfile() {
  const { user } = useAuth();
  const { data, error, isLoading, mutate } = useSWR<Usuario>(user ? `/usuarios/${user.id}` : null, fetchProfile);
  const profile = useMemo(() => {
    const base = data ?? user;
    if (!base) return null;
    return { ...base, fotoPerfil: base.fotoPerfil ?? null };
  }, [data, user]);
  return { profile, error, isLoading, mutate };
}
