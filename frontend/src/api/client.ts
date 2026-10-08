import axios, { AxiosError } from "axios";

export const TOKEN_KEY = "mr_token";
export const USER_KEY = "mr_user";

const baseURL = "/api";

export const api = axios.create({
  baseURL,
  // Render's free tier can take ~50s to wake up.
  timeout: 70000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const isLoginRequest = error.config?.url?.includes("/auth/login");
    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }
    return Promise.reject(error);
  },
);

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: unknown; message?: string } | undefined;
    if (typeof data?.error === "string") return data.error;
    if (data?.error && typeof data.error === "object") {
      const fieldErrors = (data.error as { fieldErrors?: Record<string, string[]> }).fieldErrors;
      const first = fieldErrors && Object.entries(fieldErrors).find(([, msgs]) => msgs?.length);
      if (first) return `${first[0]}: ${first[1][0]}`;
      return "Datos inválidos";
    }
    if (data?.message) return data.message;
    if (error.code === "ECONNABORTED") return "El servidor tardó demasiado en responder. Probá de nuevo.";
    if (!error.response) return "No se pudo conectar con el servidor.";
    return `Error ${error.response.status}`;
  }
  return error instanceof Error ? error.message : "Ocurrió un error inesperado";
}

export const fetcher = <T,>(url: string) => api.get<T>(url).then((r) => r.data);
