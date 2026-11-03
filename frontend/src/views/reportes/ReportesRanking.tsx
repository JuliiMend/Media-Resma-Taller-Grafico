import { useMemo } from "react";
import useSWR from "swr";
import { fetcher, getErrorMessage } from "@/api/client";
import { Pagination } from "@/components/Pagination";
import { SortableHeader } from "@/components/SortableHeader";
import { Button, EmptyState, ErrorBanner, Field, Input } from "@/components/ui";
import { cn, formatCantidad, formatMoney, toNumber } from "@/lib/format";
import { formatPorcentaje } from "@/lib/precio";
import type { PeriodoResuelto } from "@/lib/reportes";
import { useUrlParams, useUrlSortConPrefijo } from "@/lib/url-state";
import type { FilaRanking, PaginaRanking } from "@/types";
import { SkeletonTabla } from "./comunes";

const PAGE_SIZE = 25;

const COLUMNAS = [
  "nombre",
  "cantidad",
  "ingresos",
  "costo",
  "ganancia",
  "margen",
  "gananciaUnidad",
  "porcentaje",
] as const;

const FILTROS = [
  { value: "todos", label: "Todos" },
  { value: "sin-costo", label: "Sin costo cargado" },
  { value: "margen-bajo", label: "Margen bajo (<20%)" },
  { value: "perdida", label: "Pérdida (ganancia < 0)" },
] as const;

type FiltroRanking = (typeof FILTROS)[number]["value"];

export function ReportesRanking({
  periodo,
  q,
  qInput,
  onQChange,
}: {
  periodo: PeriodoResuelto;
  q: string;
  qInput: string;
  onQChange: (valor: string) => void;
}) {
  const { params, update } = useUrlParams();
  const { key: sortKey, dir: sortDir, setSort } = useUrlSortConPrefijo("r", {
    key: "ganancia",
    dir: "desc",
  });
  const filtroParam = params.get("rfiltro");
  const filtro: FiltroRanking = FILTROS.some((f) => f.value === filtroParam)
    ? (filtroParam as FiltroRanking)
    : "todos";
  const pageParam = Math.trunc(Number(params.get("rpage")));
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
  const orden = (COLUMNAS as readonly string[]).includes(sortKey)
    ? sortKey
    : "ganancia";

  const key = useMemo(() => {
    const query = new URLSearchParams();
    query.set("desde", periodo.rango.desde);
    query.set("hasta", periodo.rango.hasta);
    if (q) query.set("q", q);
    query.set("orden", orden);
    query.set("dir", sortDir);
    query.set("page", String(page));
    query.set("pageSize", String(PAGE_SIZE));
    query.set("filtro", filtro);
    return `/reportes/ranking?${query.toString()}`;
  }, [periodo.rango.desde, periodo.rango.hasta, q, orden, sortDir, page, filtro]);

  const { data, error, isLoading, mutate } = useSWR<PaginaRanking>(key, fetcher);
  const filas = data?.data ?? [];
  const maxGanancia = Math.max(...filas.map((fila) => toNumber(fila.ganancia)), 0);

  function cambiarFiltro(next: FiltroRanking) {
    update({
      rfiltro: next === "todos" ? null : next,
      rpage: null,
    });
  }

  function cambiarPagina(next: number) {
    update({ rpage: next <= 1 ? null : String(next) });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <Field label="Buscar trabajo o producto" htmlFor="ranking-q">
          <Input
            id="ranking-q"
            value={qInput}
            onChange={(e) => onQChange(e.target.value)}
            placeholder="Ej. tarjetitas doradas"
            className="w-64"
          />
        </Field>
        <div className="flex flex-wrap gap-1.5">
          {FILTROS.map((opcion) => (
            <button
              key={opcion.value}
              type="button"
              onClick={() => cambiarFiltro(opcion.value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                filtro === opcion.value
                  ? "border-ink bg-ink text-background"
                  : "border-line bg-surface text-muted hover:bg-raised hover:text-ink",
              )}
            >
              {opcion.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <ErrorBanner message={getErrorMessage(error)} onRetry={() => mutate()} />
      ) : isLoading ? (
        <SkeletonTabla />
      ) : !data || data.total === 0 ? (
        <EmptyState
          title="No hay resultados para este filtro"
          description="Probá con otro filtro, otra búsqueda o cambiá el período."
          action={
            filtro !== "todos" || q ? (
              <Button
                variant="secondary"
                onClick={() => {
                  onQChange("");
                  cambiarFiltro("todos");
                }}
              >
                Limpiar filtros
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-line bg-surface">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-background/60 text-left text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <SortableHeader
                      label="Nombre"
                      sortKey="nombre"
                      sort={{ key: orden, dir: sortDir }}
                      onSort={setSort}
                    />
                    <SortableHeader
                      label="Cantidad"
                      sortKey="cantidad"
                      sort={{ key: orden, dir: sortDir }}
                      onSort={setSort}
                      align="right"
                    />
                    <SortableHeader
                      label="Ingresos"
                      sortKey="ingresos"
                      sort={{ key: orden, dir: sortDir }}
                      onSort={setSort}
                      align="right"
                    />
                    <SortableHeader
                      label="Costo"
                      sortKey="costo"
                      sort={{ key: orden, dir: sortDir }}
                      onSort={setSort}
                      align="right"
                    />
                    <SortableHeader
                      label="Ganancia"
                      sortKey="ganancia"
                      sort={{ key: orden, dir: sortDir }}
                      onSort={setSort}
                      align="right"
                    />
                    <SortableHeader
                      label="Margen sobre venta"
                      sortKey="margen"
                      sort={{ key: orden, dir: sortDir }}
                      onSort={setSort}
                      align="right"
                    />
                    <SortableHeader
                      label="Ganancia por unidad"
                      sortKey="gananciaUnidad"
                      sort={{ key: orden, dir: sortDir }}
                      onSort={setSort}
                      align="right"
                    />
                    <SortableHeader
                      label="% de la ganancia"
                      sortKey="porcentaje"
                      sort={{ key: orden, dir: sortDir }}
                      onSort={setSort}
                      align="right"
                    />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filas.map((fila: FilaRanking) => {
                    const ganancia = toNumber(fila.ganancia);
                    const ancho =
                      maxGanancia > 0 && ganancia > 0
                        ? Math.max(2, (ganancia / maxGanancia) * 100)
                        : 0;
                    return (
                      <tr key={`${fila.productoId ?? "sin"}-${fila.producto}`}>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span>{fila.producto}</span>
                            {!fila.costoCompleto && (
                              <span className="rounded-full border border-warning/30 bg-warning-soft/60 px-2 py-0.5 text-[11px] font-medium text-warning">
                                Sin costo
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {formatCantidad(fila.cantidad)} {fila.unidad}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {formatMoney(fila.ingresos)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {formatMoney(fila.costo)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          <div className="flex items-center justify-end gap-2">
                            <span
                              className={cn(
                                "relative hidden h-1.5 w-24 overflow-hidden rounded-full bg-raised sm:block",
                              )}
                              aria-hidden="true"
                            >
                              <span
                                className={cn(
                                  "absolute inset-y-0 left-0 rounded-full",
                                  ganancia < 0 ? "bg-danger" : "bg-success",
                                )}
                                style={{ width: `${ancho}%` }}
                              />
                            </span>
                            <span className={cn(ganancia < 0 && "text-danger")}>
                              {formatMoney(fila.ganancia)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {formatPorcentaje(fila.margen)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {fila.gananciaUnidad === null
                            ? "—"
                            : formatMoney(fila.gananciaUnidad)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {formatPorcentaje(fila.porcentajeGanancia)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <Pagination
            total={data.total}
            page={data.page}
            pageSize={PAGE_SIZE}
            onPageChange={cambiarPagina}
            noun={{ one: "fila", many: "filas" }}
          />
        </>
      )}
    </div>
  );
}
