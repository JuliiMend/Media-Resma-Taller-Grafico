export type SortDir = "asc" | "desc";
export type SortType = "texto" | "numero" | "fecha" | "booleano";

export interface SortState {
  key: string;
  dir: SortDir;
}

/**
 * Normaliza un valor para comparación. Devuelve `null` cuando el valor está
 * vacío: los vacíos van siempre al final, sin importar la dirección.
 */
function normalize(value: unknown, type: SortType): string | number | null {
  if (value === null || value === undefined) return null;
  if (type === "texto") {
    const s = typeof value === "string" ? value : String(value);
    return s.trim() === "" ? null : s;
  }
  if (type === "numero") {
    if (typeof value === "string" && value.trim() === "") return null;
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? n : null;
  }
  if (type === "fecha") {
    if (typeof value === "string" && value.trim() === "") return null;
    const t = new Date(value as string | number | Date).getTime();
    return Number.isNaN(t) ? null : t;
  }
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string" && value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? (n ? 1 : 0) : null;
}

export function compareValues(a: unknown, b: unknown, type: SortType, dir: SortDir): number {
  const na = normalize(a, type);
  const nb = normalize(b, type);
  if (na === null && nb === null) return 0;
  if (na === null) return 1;
  if (nb === null) return -1;
  let r = 0;
  if (type === "texto") r = String(na).localeCompare(String(nb), "es", { sensitivity: "base", numeric: true });
  else r = (na as number) - (nb as number);
  return dir === "desc" ? -r : r;
}

/** Deduce el tipo de orden a partir del valor más representativo de la columna. */
export function inferSortType(value: unknown): SortType {
  if (typeof value === "boolean") return "booleano";
  if (typeof value === "number") return "numero";
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}([T\s]|$)/.test(value)) return "fecha";
    if (value.trim() !== "" && Number.isFinite(Number(value))) return "numero";
    return "texto";
  }
  return "texto";
}

export function sortItems<T>(items: T[], get: (item: T) => unknown, type: SortType, dir: SortDir): T[] {
  return [...items].sort((a, b) => compareValues(get(a), get(b), type, dir));
}
