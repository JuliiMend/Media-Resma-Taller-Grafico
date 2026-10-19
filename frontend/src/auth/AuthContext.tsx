import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { api, TOKEN_KEY, USER_KEY } from "@/api/client";
import type { Usuario } from "@/types";

interface AuthContextValue {
  user: Usuario | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (changes: Partial<Usuario>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): Usuario | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as Usuario) : null;
  } catch {
    return null;
  }
}

// The session only keeps the identity fields; the profile photo is loaded from the API.
function toSessionUser(u: Usuario): Usuario {
  return { id: u.id, nombre: u.nombre, email: u.email, fotoPerfil: u.fotoPerfil ?? null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<Usuario | null>(readStoredUser);

  const login = useCallback(async (email: string, password: string) => {
    // The backend answers with `usuario`; `user` is accepted as well.
    const { data } = await api.post<{ token: string; usuario?: Usuario; user?: Usuario }>("/auth/login", { email, password });
    const loggedUser = data.usuario ?? data.user;
    if (!loggedUser) throw new Error("Respuesta de login inválida");
    const sessionUser = toSessionUser(loggedUser);
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(sessionUser));
    setToken(data.token);
    setUser(sessionUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((changes: Partial<Usuario>) => {
    setUser((current) => {
      if (!current) return current;
      const next = toSessionUser({ ...current, ...changes });
      localStorage.setItem(USER_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const value = useMemo(() => ({ user, token, login, logout, updateUser }), [user, token, login, logout, updateUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
