import axios from "axios";

// Cliente HTTP único apuntando al backend. La URL sale de la
// variable de entorno VITE_API_URL (ver .env / .env.example).
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:4000/api",
});
