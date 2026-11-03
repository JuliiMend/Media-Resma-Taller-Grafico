import { useMemo } from "react";
import useSWR from "swr";
import { fetcher, getErrorMessage } from "@/api/client";
import { Pagination, paginate } from "@/components/Pagination";
import { SortableHeader } from "@/components/SortableHeader";
import { EmptyState, ErrorBanner } from "@/components/ui";
import { formatCantidad, formatDate, formatMoney, toNumber } from "@/lib/format";
import { formatPorcentaje } from "@/lib/precio";
import { etiquetaComparacion, type PeriodoResuelto } from "@/lib/reportes";
import { sortItems, type SortType } from "@/lib/sort";
import { useUrlParams, useUrlSortConPrefijo } from "@/lib/url-state";
import type { BalanceReporte, Compra, Gasto, GastoPorCategoria } from "@/types";
import { SkeletonCards, SkeletonTabla, TarjetaTotal, Variacion } from "./comunes";

const PAGE_SIZE = 10;

const TIPOS_ORDEN_GASTOS: Record<string, SortType> = {
  categoria: "texto",
  monto: "numero",
};

function valorOrdenGasto(fila: GastoPorCategoria, key: string): unknown {
  return key === "categoria" ? fila.categoria : toNumber(fila.monto);
}

function ListaCompras({ compras }: { compras: Compra[] }) {
  const { params, update } = useUrlParams();
  const pageParam = Math.trunc(Number(params.get("bcpage")));
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
  const visibles = paginate(compras, page, PAGE_SIZE);

  if (compras.length === 0) {
    return <p className="text-sm text-muted">No hay compras de insumos en el período.</p>;
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-sm">
          <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">Fecha</th>
              <th scope="col" className="px-3 py-2 font-medium">Insumo</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Cantidad</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Precio unit.</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {visibles.map((compra) => (
              <tr key={compra.id}>
                <td className="whitespace-nowrap px-3 py-2 text-muted">{formatDate(compra.fecha)}</td>
                <td className="px-3 py-2">{compra.insumo?.nombre ?? `Insumo #${compra.insumoId}`}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatCantidad(compra.cantidad)} {compra.insumo?.unidad ?? ""}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{formatMoney(compra.precio)}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatMoney(toNumber(compra.cantidad) * toNumber(compra.precio))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {compras.length > PAGE_SIZE && (
        <Pagination
          total={compras.length}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={(next) => update({ bcpage: next <= 1 ? null : String(next) })}
          noun={{ one: "compra", many: "compras" }}
        />
      )}
    </>
  );
}

function ListaGastos({ gastos }: { gastos: Gasto[] }) {
  const { params, update } = useUrlParams();
  const pageParam = Math.trunc(Number(params.get("bgpage")));
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
  const visibles = paginate(gastos, page, PAGE_SIZE);

  if (gastos.length === 0) {
    return <p className="text-sm text-muted">No hay gastos registrados en el período.</p>;
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] text-sm">
          <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">Fecha</th>
              <th scope="col" className="px-3 py-2 font-medium">Concepto</th>
              <th scope="col" className="px-3 py-2 font-medium">Medio de pago</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Monto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {visibles.map((gasto) => (
              <tr key={gasto.id}>
                <td className="whitespace-nowrap px-3 py-2 text-muted">{formatDate(gasto.fecha)}</td>
                <td className="px-3 py-2">{gasto.concepto}</td>
                <td className="px-3 py-2 text-muted">{gasto.medioPago || "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatMoney(gasto.monto)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {gastos.length > PAGE_SIZE && (
        <Pagination
          total={gastos.length}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={(next) => update({ bgpage: next <= 1 ? null : String(next) })}
          noun={{ one: "gasto", many: "gastos" }}
        />
      )}
    </>
  );
}

export function ReportesBalance({ periodo }: { periodo: PeriodoResuelto }) {
  const { params } = useUrlParams();
  const { key: sortKey, dir: sortDir, setSort } = useUrlSortConPrefijo("bgc", {
    key: "monto",
    dir: "desc",
  });

  const key = useMemo(() => {
    const query = new URLSearchParams();
    query.set("desde", periodo.rango.desde);
    query.set("hasta", periodo.rango.hasta);
    return `/reportes/balance?${query.toString()}`;
  }, [periodo.rango.desde, periodo.rango.hasta]);

  const { data, error, isLoading, mutate } = useSWR<BalanceReporte>(key, fetcher);

  const effectiveKey = TIPOS_ORDEN_GASTOS[sortKey] ? sortKey : "monto";
  const gastosOrdenados = useMemo(
    () =>
      sortItems(
        data?.gastosPorCategoria ?? [],
        (fila) => valorOrdenGasto(fila, effectiveKey),
        TIPOS_ORDEN_GASTOS[effectiveKey] ?? "numero",
        sortDir,
      ),
    [data?.gastosPorCategoria, effectiveKey, sortDir],
  );

  const actual = data?.actual;
  const anterior = data?.anterior;
  const variacion = data?.variacion;
  const comparacion = etiquetaComparacion(periodo);

  if (error) {
    return <ErrorBanner message={getErrorMessage(error)} onRetry={() => mutate()} />;
  }

  if (isLoading || !actual) {
    return (
      <>
        <SkeletonCards cantidad={7} />
        <SkeletonTabla />
      </>
    );
  }

  const resultado = toNumber(actual.resultado);
  const caja = toNumber(actual.cajaEstimada);
  const sinMovimiento =
    toNumber(actual.ingresos) === 0 &&
    toNumber(actual.gastos) === 0 &&
    toNumber(actual.comprasInsumos) === 0;

  return (
    <div>
      {sinMovimiento ? (
        <EmptyState
          title="No hay movimientos en este período"
          description="No se registraron ventas, gastos ni compras de insumos en el período elegido."
        />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <TarjetaTotal
              label="Ingresos"
              value={formatMoney(actual.ingresos)}
              ayuda="Suma de trabajos de pedidos no cancelados del período (cantidad × valor unitario)."
            >
              <Variacion
                valor={variacion?.ingresos ?? null}
                actual={toNumber(actual.ingresos)}
                anterior={anterior ? toNumber(anterior.ingresos) : null}
                etiqueta={comparacion}
              />
            </TarjetaTotal>
            <TarjetaTotal
              label="Costo de trabajos"
              value={formatMoney(actual.costoTrabajos)}
              ayuda="Suma de cantidad × costo unitario de los trabajos del período."
            >
              <Variacion
                valor={variacion?.costoTrabajos ?? null}
                actual={toNumber(actual.costoTrabajos)}
                anterior={anterior ? toNumber(anterior.costoTrabajos) : null}
                etiqueta={comparacion}
                inverso
              />
            </TarjetaTotal>
            <TarjetaTotal
              label="Ganancia bruta"
              value={formatMoney(actual.gananciaBruta)}
              tono={toNumber(actual.gananciaBruta) < 0 ? "danger" : undefined}
              ayuda="Ingresos − costo de trabajos."
            >
              <Variacion
                valor={variacion?.gananciaBruta ?? null}
                actual={toNumber(actual.gananciaBruta)}
                anterior={anterior ? toNumber(anterior.gananciaBruta) : null}
                etiqueta={comparacion}
              />
            </TarjetaTotal>
            <TarjetaTotal
              label="Gastos"
              value={formatMoney(actual.gastos)}
              ayuda="Gastos registrados en el período."
            >
              <Variacion
                valor={variacion?.gastos ?? null}
                actual={toNumber(actual.gastos)}
                anterior={anterior ? toNumber(anterior.gastos) : null}
                etiqueta={comparacion}
                inverso
              />
            </TarjetaTotal>
            <TarjetaTotal
              label="Resultado del mes"
              value={formatMoney(actual.resultado)}
              destacada
              tono={resultado < 0 ? "danger" : "success"}
              ayuda="Ganancia bruta − gastos."
            >
              <Variacion
                valor={variacion?.resultado ?? null}
                actual={resultado}
                anterior={anterior ? toNumber(anterior.resultado) : null}
                etiqueta={comparacion}
              />
            </TarjetaTotal>
            <TarjetaTotal
              label="Invertido en insumos"
              value={formatMoney(actual.comprasInsumos)}
              ayuda="Compras de insumos del período. Es informativo: no se resta del resultado porque el costo de los trabajos ya incluye el costo de los insumos y se contaría dos veces."
            >
              <Variacion
                valor={variacion?.comprasInsumos ?? null}
                actual={toNumber(actual.comprasInsumos)}
                anterior={anterior ? toNumber(anterior.comprasInsumos) : null}
                etiqueta={comparacion}
                inverso
              />
            </TarjetaTotal>
            <TarjetaTotal
              label="Caja estimada"
              value={formatMoney(actual.cajaEstimada)}
              tono={caja < 0 ? "danger" : undefined}
              ayuda="Ingresos − compras de insumos − gastos. Estimado: no considera cobros reales ni deudas."
            >
              <Variacion
                valor={variacion?.cajaEstimada ?? null}
                actual={caja}
                anterior={anterior ? toNumber(anterior.cajaEstimada) : null}
                etiqueta={comparacion}
              />
            </TarjetaTotal>
            <div className="rounded-xl border border-line bg-surface px-4 py-3">
              <p className="text-xs text-muted">Margen sobre venta</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums">
                {formatPorcentaje(data.margen)}
              </p>
              <p className="mt-1 text-xs text-muted">Ganancia bruta / ingresos</p>
            </div>
          </div>

          <p className="mb-4 text-xs text-muted text-pretty">
            El resultado del mes es la ganancia bruta menos los gastos. Las compras de insumos se
            muestran aparte como dato informativo y no se restan del resultado: el costo de los
            trabajos ya incluye los insumos. La caja estimada tampoco considera cobros reales ni
            deudas.
          </p>

          {!actual.costoCompleto && (
            <div className="mb-6 rounded-xl border border-warning/25 bg-warning-soft/40 px-4 py-3 text-sm">
              <p className="font-medium text-warning">
                Resultado sobreestimado: {actual.trabajosSinCosto}{" "}
                {actual.trabajosSinCosto === 1
                  ? "trabajo sin costo cargado"
                  : "trabajos sin costo cargado"}
              </p>
              <p className="mt-1 text-muted text-pretty">
                La ganancia bruta se calcula tomando el costo faltante como 0.
              </p>
            </div>
          )}

          <section className="mb-6 overflow-hidden rounded-xl border border-line bg-surface">
            <div className="border-b border-line bg-background/60 px-4 py-3">
              <h2 className="text-sm font-semibold">Gastos por concepto</h2>
            </div>
            {gastosOrdenados.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted">No hay gastos registrados en el período.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[30rem] text-sm">
                  <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <SortableHeader
                        label="Concepto"
                        sortKey="categoria"
                        sort={{ key: effectiveKey, dir: sortDir }}
                        onSort={setSort}
                      />
                      <SortableHeader
                        label="Monto"
                        sortKey="monto"
                        sort={{ key: effectiveKey, dir: sortDir }}
                        onSort={setSort}
                        align="right"
                      />
                      <th scope="col" className="px-4 py-3 text-right font-medium">
                        % del total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {gastosOrdenados.map((fila) => {
                      const total = toNumber(actual.gastos);
                      const monto = toNumber(fila.monto);
                      const porcentaje = total === 0 ? null : (monto / total) * 100;
                      return (
                        <tr key={fila.categoria}>
                          <td className="px-4 py-2.5">{fila.categoria}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">
                            {formatMoney(fila.monto)}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums">
                            {formatPorcentaje(porcentaje)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t border-line bg-background/40 font-semibold">
                    <tr>
                      <td className="px-4 py-2.5">Total de gastos</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {formatMoney(actual.gastos)}
                      </td>
                      <td className="px-4 py-2.5" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="overflow-hidden rounded-xl border border-line bg-surface">
              <div className="border-b border-line bg-background/60 px-4 py-3">
                <h2 className="text-sm font-semibold">Últimas compras de insumos</h2>
              </div>
              <div className="p-4">
                <ListaCompras compras={data.compras} />
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-line bg-surface">
              <div className="border-b border-line bg-background/60 px-4 py-3">
                <h2 className="text-sm font-semibold">Últimos gastos</h2>
              </div>
              <div className="p-4">
                <ListaGastos gastos={data.gastos} />
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
