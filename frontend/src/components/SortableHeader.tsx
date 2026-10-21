import { useId } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/format";
import type { SortDir, SortState } from "@/lib/sort";
import { Button, Field, Select } from "./ui";

export interface SortField {
  key: string;
  label: string;
}

/**
 * Encabezado de columna ordenable: ciclo asc → desc → orden por defecto,
 * con `aria-sort` y flechas indicando la dirección activa.
 */
export function SortableHeader({
  label,
  sortKey,
  sort,
  onSort,
  align,
  className,
}: {
  label: string;
  sortKey: string;
  sort: { key: string; dir: SortDir };
  onSort: (next: SortState | null) => void;
  align?: "left" | "right";
  className?: string;
}) {
  const active = sort.key === sortKey;

  function handleClick() {
    if (!active) onSort({ key: sortKey, dir: "asc" });
    else if (sort.dir === "asc") onSort({ key: sortKey, dir: "desc" });
    else onSort(null);
  }

  return (
    <th
      scope="col"
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
      className={cn("px-4 py-3 font-medium", align === "right" && "text-right", className)}
    >
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "group inline-flex items-center gap-1 uppercase tracking-wide transition-colors hover:text-ink",
          align === "right" && "flex-row-reverse",
        )}
      >
        {label}
        {active ? (
          sort.dir === "asc" ? (
            <ArrowUp className="size-3.5 text-ink" aria-hidden="true" />
          ) : (
            <ArrowDown className="size-3.5 text-ink" aria-hidden="true" />
          )
        ) : (
          <ArrowUpDown className="size-3.5 opacity-0 transition-opacity group-hover:opacity-60" aria-hidden="true" />
        )}
      </button>
    </th>
  );
}

/**
 * Control de orden para la vista de tarjetas (móvil): selector de columna y
 * botón de dirección. Oculto en pantallas grandes salvo que se pida lo contrario.
 */
export function SortControl({
  fields,
  sort,
  onSort,
  label = "Ordenar por",
  className = "md:hidden",
}: {
  fields: SortField[];
  sort: { key: string; dir: SortDir };
  onSort: (next: SortState | null) => void;
  label?: string;
  className?: string;
}) {
  const id = useId();
  const safeKey = fields.some((f) => f.key === sort.key) ? sort.key : (fields[0]?.key ?? "");
  const current = fields.find((f) => f.key === safeKey);

  return (
    <div className={cn("flex items-end gap-2", className)}>
      <div className="min-w-0 flex-1">
        <Field label={label} htmlFor={id}>
          <Select
            id={id}
            value={safeKey}
            onChange={(e) => onSort({ key: e.target.value, dir: e.target.value === sort.key ? sort.dir : "asc" })}
          >
            {fields.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Button
        type="button"
        variant="secondary"
        onClick={() => onSort({ key: safeKey, dir: sort.dir === "asc" ? "desc" : "asc" })}
        aria-label={`Cambiar a orden ${sort.dir === "asc" ? "descendente" : "ascendente"} por ${current?.label ?? "la columna"}`}
        className="shrink-0 px-3"
        size="md"
      >
        {sort.dir === "asc" ? <ArrowUp className="size-4" aria-hidden="true" /> : <ArrowDown className="size-4" aria-hidden="true" />}
      </Button>
    </div>
  );
}
