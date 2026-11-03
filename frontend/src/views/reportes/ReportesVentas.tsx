import { useMemo } from "react";
import useSWR from "swr";
import { fetcher, getErrorMessage } from "@/api/client";
import { Pagination, clampPage, paginate } from "@/components/Pagination";
import { SortableHeader } from "@/components/SortableHeader";
import { Button, EmptyState, ErrorBanner, Field, Input, Select } from "@/components/ui";
import { formatCantidad, formatMoney, toNumber } from "@/lib/format";
import { formatPorcentaje } from "@/lib/precio";
import {
  diferenciaPuntos,
  etiquetaComparacion,
  labelMes,
  mesAnterior,
  type PeriodoResuelto,
} from "@/lib/reportes";
import { sortItems, type SortType } from "@/lib/sort";
import { useUrlParams, useUrlSortConPrefijo } from "@/lib/url-state";
import type { FilaVenta, Producto, ResumenReporte } from "@/types";
import { SkeletonCards, SkeletonTabla, TarjetaTotal, Variacion } from "./comunes";

const PAGE_SIZE = 25;

const SORT_TYPES: Record<string, SortType> = {
  producto: "texto",
  cantidad: "numero",
  ingresos: "numero",
  costo: "numero",
  ganancia: "numero",
  margen: "numero",
};

function valorOrden(fila: FilaVenta, key: string): unknown {
  switch (key) {
    case "producto":
      return fila.producto;
    case "cantidad":
      return toNumber(fila.cantidad);
    case "ingresos":
      return toNumber(fila.ingresos);
    case "costo":
      return toNumber(fila.costo);
    case "margen":
      return fila.margen;
    default:
      return toNumber(fila.ganancia);
  }
}

export function ReportesVentas({
  periodo,
  q,
  qInput,
  onQChange,
  productoId,
  onProductoChange,
  onIrARankingSinCosto,
}: {
  periodo: PeriodoResuelto;
  q: string;
  qInput: string;
  onQChange: (valor: string) => void;
  productoId: string;
  onProductoChange: (valor: string) => void;
  onIrARankingSinCosto: () => void;
}) {
  const { params, update } = useUrlParams();
  const { key: sortKey, dir: sortDir, setSort } = useUrlSortConPrefijo("", {
    key: "ganancia",
    dir: "desc",
  });
  const pageParam = Math.trunc(Number(params.get("page")));
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

  const { data: productos } = useSWR<Producto[]>("/productos", fetcher);

  const { ventasKey, resumenKey } = useMemo(() => {
    const base = new URLSearchParams();
    base.set("desde", periodo.rango.desde);
    base.set("hasta", periodo.rango.hasta);
    if (productoId) base.set("productoId", productoId);
    if (q) base.set("q", q);
    const resumen = new URLSearchParams(base);
    resumen.set("comparar", periodo.comparar ? "1" : "0");
    return {
      ventasKey: `/reportes/ventas?${base.toString()}`,
      resumenKey: `/reportes/resumen?${resumen.toString()}`,
    };
  }, [periodo.comparar, periodo.rango.desde, periodo.rango.hasta, productoId, q]);

  const {
    data: filas,
    error: errorFilas,
    isLoading: cargandoFilas,
    mutate: mutateFilas,
  } = useSWR<FilaVenta[]>(periodo.modo === "todo" ? null : ventasKey, fetcher);
  const {
    data: resumen,
    error: errorResumen,
    isLoading: cargandoResumen,
    mutate: mutateResumen,
  } = useSWR<ResumenReporte>(resumenKey, fetcher);

  const cargando = cargandoFilas || cargandoResumen;
  const error = errorFilas ?? errorResumen;
  const reintentar = () => {
    void mutateFilas();
    void mutateResumen();
  };

  const effectiveKey = SORT_TYPES[sortKey] ? sortKey : "ganancia";
  const ordenadas = useMemo(
    () =>
      sortItems(
        filas ?? [],
        (fila) => valorOrden(fila, effectiveKey),
        SORT_TYPES[effectiveKey] ?? "numero",
        sortDir,
      ),
    [filas, effectiveKey, sortDir],
  );

  const actual = resumen?.actual;
  const anterior = resumen?.anterior;
  const comparacion = etiquetaComparacion(periodo);
  const pageActual = clampPage(page, ordenadas.length, PAGE_SIZE);
  const visibles = paginate(ordenadas, pageActual, PAGE_SIZE);

  function cambiarPagina(next: number) {
    update({ page: next <= 1 ? null : String(next) });
  }

  function irAlMesAnterior() {
    update({
      modo: "mes",
      mes: mesAnterior(periodo.mes),
      desde: null,
      hasta: null,
      page: null,
      rpage: null,
    });
  }

  const sinVentas =
    !cargando && !error && periodo.modo !== "todo" && ordenadas.length === 0;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <Field label="Producto" htmlFor="rep-producto">
          <Select
            id="rep-producto"
            value={productoId}
            onChange={(e) => {
              onProductoChange(e.target.value);
              update({ page: null });
            }}
            className="w-64"
          >
            <option value="">Todos los productos</option>
            {(productos ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Buscar trabajo o producto" htmlFor="rep-q">
          <Input
            id="rep-q"
            value={qInput}
            onChange={(e) => onQChange(e.target.value)}
            placeholder="Ej. tarjetitas doradas"
            className="w-64"
          />
        </Field>
      </div>

      {error ? (
        <ErrorBanner message={getErrorMessage(error)} onRetry={reintentar} />
      ) : cargando ? (
        <>
          <SkeletonCards />
          <SkeletonTabla />
        </>
      ) : sinVentas ? (
        <EmptyState
          title={
            periodo.modo === "mes"
              ? "No hay ventas en este mes"
              : "No hay ventas en este período"
          }
          description="Probá con otro mes, un rango distinto o limpiá los filtros."
          action={
            periodo.modo === "mes" ? (
              <Button variant="secondary" onClick={irAlMesAnterior}>
                Ir a {labelMes(mesAnterior(periodo.mes))}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {actual && (
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <TarjetaTotal label="Ingresos" value={formatMoney(actual.ingresos)}>
                <Variacion
                  valor={resumen?.variacion?.ingresos ?? null}
                  actual={toNumber(actual.ingresos)}
                  anterior={anterior ? toNumber(anterior.ingresos) : null}
                  etiqueta={comparacion}
                />
              </TarjetaTotal>
              <TarjetaTotal label="Costo" value={formatMoney(actual.costo)}>
                <Variacion
                  valor={resumen?.variacion?.costo ?? null}
                  actual={toNumber(actual.costo)}
                  anterior={anterior ? toNumber(anterior.costo) : null}
                  etiqueta={comparacion}
                  inverso
                />
              </TarjetaTotal>
              <TarjetaTotal
                label="Ganancia"
                value={formatMoney(actual.ganancia)}
                tono={toNumber(actual.ganancia) < 0 ? "danger" : undefined}
              >
                <Variacion
                  valor={resumen?.variacion?.ganancia ?? null}
                  actual={toNumber(actual.ganancia)}
                  anterior={anterior ? toNumber(anterior.ganancia) : null}
                  etiqueta={comparacion}
                />
              </TarjetaTotal>
              <TarjetaTotal
                label="Margen sobre venta"
                value={formatPorcentaje(actual.margen)}
              >
                <Variacion
                  valor={diferenciaPuntos(actual.margen, anterior?.margen)}
                  actual={actual.margen ?? 0}
                  anterior={anterior?.margen}
                  etiqueta={comparacion}
                  puntos
                />
              </TarjetaTotal>
            </div>
          )}

          {actual && !actual.costoCompleto && (
            <div className="mb-6 rounded-xl border border-warning/25 bg-warning-soft/40 px-4 py-3 text-sm">
              <p className="font-medium text-warning">
                {actual.trabajosSinCosto}{" "}
                {actual.trabajosSinCosto === 1 ? "trabajo sin costo" : "trabajos sin costo"}: la
                ganancia puede estar sobreestimada
              </p>
              <button
                type="button"
                onClick={onIrARankingSinCosto}
                className="mt-1 font-medium text-warning underline underline-offset-2"
              >
                Ver en Ranking
              </button>
            </div>
          )}

          {periodo.modo !== "todo" && (
            <>
              <div className="overflow-hidden rounded-xl border border-line bg-surface">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[52rem] text-sm">
                <thead className="border-b border-line bg-background/60 text-left text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <SortableHeader
                      label="Producto/Trabajo"
                      sortKey="producto"
                      sort={{ key: effectiveKey, dir: sortDir }}
                      onSort={setSort}
                    />
                    <SortableHeader
                      label="Cantidad"
                      sortKey="cantidad"
                      sort={{ key: effectiveKey, dir: sortDir }}
                      onSort={setSort}
                      align="right"
                    />
                    <SortableHeader
                      label="Ingresos"
                      sortKey="ingresos"
                      sort={{ key: effectiveKey, dir: sortDir }}
                      onSort={setSort}
                      align="right"
                    />
                    <SortableHeader
                      label="Costo"
                      sortKey="costo"
                      sort={{ key: effectiveKey, dir: sortDir }}
                      onSort={setSort}
                      align="right"
                    />
                    <SortableHeader
                      label="Ganancia"
                      sortKey="ganancia"
                      sort={{ key: effectiveKey, dir: sortDir }}
                      onSort={setSort}
                      align="right"
                    />
                    <SortableHeader
                      label="Margen sobre venta"
                      sortKey="margen"
                      sort={{ key: effectiveKey, dir: sortDir }}
                      onSort={setSort}
                      align="right"
                    />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {visibles.map((fila) => (
                    <tr key={`${fila.productoId ?? "sin"}-${fila.producto}`}>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="max-w-[24rem] truncate" title={fila.producto}>{fila.producto}</span>
                          {!fila.costoCompleto && (
                            <span
                              className="rounded-full border border-warning/30 bg-warning-soft/60 px-2 py-0.5 text-[11px] font-medium text-warning"
                              title="Algunas líneas de esta venta no tienen costo cargado."
                            >
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
                        {formatMoney(fila.ganancia)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {formatPorcentaje(fila.margen)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {actual && (
                  <tfoot className="border-t border-line bg-background/40 font-semibold">
                    <tr>
                      <td className="px-4 py-2.5">Total del período</td>
                      <td className="px-4 py-2.5" />
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {formatMoney(actual.ingresos)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {formatMoney(actual.costo)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {formatMoney(actual.ganancia)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {formatPorcentaje(actual.margen)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {ordenadas.length > PAGE_SIZE && (
            <Pagination
              total={ordenadas.length}
              page={pageActual}
              pageSize={PAGE_SIZE}
              onPageChange={cambiarPagina}
              noun={{ one: "fila", many: "filas" }}
            />
          )}
            </>
          )}
        </>
      )}
    </div>
  );
}
