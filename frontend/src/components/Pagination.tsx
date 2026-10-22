import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button, Select } from "./ui";

export const PAGE_SIZE = 10;

export function pageCount(total: number, pageSize = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function clampPage(page: number, total: number, pageSize = PAGE_SIZE): number {
  return Math.min(Math.max(page, 1), pageCount(total, pageSize));
}

export function paginate<T>(items: T[], page: number, pageSize = PAGE_SIZE): T[] {
  const actual = clampPage(page, items.length, pageSize);
  return items.slice((actual - 1) * pageSize, actual * pageSize);
}

function numerosDePagina(actual: number, paginas: number): (number | "gap")[] {
  if (paginas <= 7) return Array.from({ length: paginas }, (_, i) => i + 1);
  if (actual <= 4) return [1, 2, 3, 4, 5, "gap", paginas];
  if (actual >= paginas - 3) {
    return [1, "gap", paginas - 4, paginas - 3, paginas - 2, paginas - 1, paginas];
  }
  return [1, "gap", actual - 1, actual, actual + 1, "gap", paginas];
}

interface PaginationProps {
  total: number;
  page: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  /** Para el texto "X de N clientes / productos / …". */
  noun?: { one: string; many: string };
  /** Prefijo del resumen, por ejemplo "Mostrando ". */
  prefix?: string;
  pageSizeOptions?: number[];
  onPageSizeChange?: (pageSize: number) => void;
}

export function Pagination({
  total,
  page,
  pageSize = PAGE_SIZE,
  onPageChange,
  noun,
  prefix = "",
  pageSizeOptions,
  onPageSizeChange,
}: PaginationProps) {
  if (total === 0) return null;

  const paginas = pageCount(total, pageSize);
  const actual = clampPage(page, total, pageSize);
  const desde = (actual - 1) * pageSize + 1;
  const hasta = Math.min(actual * pageSize, total);
  const etiqueta = noun ? ` ${total === 1 ? noun.one : noun.many}` : "";
  const numeros = numerosDePagina(actual, paginas);

  return (
    <nav
      aria-label="Paginación"
      className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm"
    >
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-muted tabular-nums">
          {prefix}
          {desde}–{hasta} de {total}
          {etiqueta}
        </p>
        {pageSizeOptions && onPageSizeChange && (
          <label className="flex items-center gap-2 text-muted">
            Mostrar
            <Select
              aria-label="Resultados por página"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-8 w-auto py-0 pr-8 text-sm"
            >
              {pageSizeOptions.map((opcion) => (
                <option key={opcion} value={opcion}>
                  {opcion}
                </option>
              ))}
            </Select>
          </label>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={actual <= 1}
          onClick={() => onPageChange(actual - 1)}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Anterior
        </Button>
        <div className="flex items-center gap-1">
          {numeros.map((numero, indice) =>
            numero === "gap" ? (
              <span key={`gap-${indice}`} className="px-1 text-muted" aria-hidden="true">
                …
              </span>
            ) : (
              <Button
                key={numero}
                type="button"
                variant={numero === actual ? "primary" : "secondary"}
                size="sm"
                className="min-w-8 px-2 tabular-nums"
                aria-label={`Página ${numero}`}
                aria-current={numero === actual ? "page" : undefined}
                onClick={() => onPageChange(numero)}
              >
                {numero}
              </Button>
            ),
          )}
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={actual >= paginas}
          onClick={() => onPageChange(actual + 1)}
        >
          Siguiente
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
