import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import type { SortDir, SortState } from "./sort";

type ParamUpdates = Record<string, string | null | undefined>;

/** Lee y escribe query params de la URL actual (sin ensuciar el historial). */
export function useUrlParams() {
  const [params, setParams] = useSearchParams();

  const update = useCallback(
    (updates: ParamUpdates) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(updates)) {
            if (value === null || value === undefined || value === "") next.delete(key);
            else next.set(key, value);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  return { params, update };
}

export function useUrlParam(name: string): [string, (value: string) => void] {
  const { params, update } = useUrlParams();
  const value = params.get(name) ?? "";
  const set = useCallback((next: string) => update({ [name]: next }), [name, update]);
  return [value, set];
}

/**
 * Estado de orden (`orden`/`dir`) persistido en la URL. Al no haber parámetros
 * se usa `defaultSort`; `setSort(null)` vuelve al orden por defecto.
 */
export function useUrlSort(defaultSort: SortState) {
  const { params, update } = useUrlParams();
  const orden = params.get("orden") ?? "";
  const dirParam = params.get("dir") ?? "";
  const key = orden || defaultSort.key;
  const dir: SortDir = dirParam === "asc" || dirParam === "desc" ? dirParam : defaultSort.dir;
  const isDefault = (!orden || orden === defaultSort.key) && dir === defaultSort.dir;

  const setSort = useCallback(
    (next: SortState | null) => {
      const value = next ?? defaultSort;
      const clean = value.key === defaultSort.key && value.dir === defaultSort.dir;
      update({ orden: clean ? null : value.key, dir: clean ? null : value.dir, page: null });
    },
    [defaultSort, update],
  );

  return { key, dir, isDefault, setSort };
}
