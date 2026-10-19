import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui";

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

interface PaginationProps {
  total: number;
  page: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  /** Para el texto "X de N clientes / productos / …". */
  noun?: { one: string; many: string };
}

export function Pagination({ total, page, pageSize = PAGE_SIZE, onPageChange, noun }: PaginationProps) {
  const paginas = pageCount(total, pageSize);
  if (paginas <= 1) return null;

  const actual = clampPage(page, total, pageSize);
  const desde = (actual - 1) * pageSize + 1;
  const hasta = Math.min(actual * pageSize, total);
  const etiqueta = noun ? ` ${total === 1 ? noun.one : noun.many}` : "";

  return (
    <nav aria-label="Paginación" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-muted tabular-nums">
        {desde}–{hasta} de {total}
        {etiqueta}
      </p>
      <div className="flex items-center gap-2">
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
        <span className="px-1 text-muted tabular-nums">
          Página {actual} de {paginas}
        </span>
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
