import { useMemo, useState } from "react";
import useSWR from "swr";
import { fetcher, getErrorMessage } from "@/api/client";
import { EmptyState, ErrorBanner, Field, Input, LoadingState, PageHeader, Select } from "@/components/ui";
import { cn, formatMoney, toNumber } from "@/lib/format";
import type { FilaVenta, Producto } from "@/types";

const numFormatter = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function haceSeisMesesISO(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 6);
  return d.toISOString().slice(0, 10);
}

function labelMes(mes: string): string {
  const fecha = new Date(`${mes}-01T00:00:00Z`);
  if (Number.isNaN(fecha.getTime())) return mes;
  const texto = fecha.toLocaleDateString("es-AR", { month: "long", year: "numeric", timeZone: "UTC" });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

interface TotalesMes {
  cantidad: number;
  ingresos: number;
  costo: number;
  ganancia: number;
}

function acumular(filas: FilaVenta[]): TotalesMes {
  return filas.reduce<TotalesMes>(
    (acc, f) => ({
      cantidad: acc.cantidad + toNumber(f.cantidad),
      ingresos: acc.ingresos + toNumber(f.ingresos),
      costo: acc.costo + toNumber(f.costo),
      ganancia: acc.ganancia + toNumber(f.ganancia),
    }),
    { cantidad: 0, ingresos: 0, costo: 0, ganancia: 0 },
  );
}

export function ReportesPage() {
  const [desde, setDesde] = useState(haceSeisMesesISO);
  const [hasta, setHasta] = useState(hoyISO);
  const [productoId, setProductoId] = useState("");

  const { data: productos } = useSWR<Producto[]>("/productos", fetcher);

  const key = useMemo(() => {
    const params = new URLSearchParams();
    if (desde) params.set("desde", desde);
    if (hasta) params.set("hasta", hasta);
    if (productoId) params.set("productoId", productoId);
    const query = params.toString();
    return query ? `/reportes/ventas?${query}` : "/reportes/ventas";
  }, [desde, hasta, productoId]);

  const { data: filas, error, isLoading, mutate } = useSWR<FilaVenta[]>(key, fetcher);

  const porMes = useMemo(() => {
    const mapa = new Map<string, FilaVenta[]>();
    for (const f of filas ?? []) {
      const arr = mapa.get(f.mes) ?? [];
      arr.push(f);
      mapa.set(f.mes, arr);
    }
    return Array.from(mapa.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filas]);

  const totales = filas ? acumular(filas) : null;

  return (
    <div>
      <PageHeader title="Reportes" description="Ventas por mes con cantidad, ingresos, costo y ganancia." />

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <Field label="Desde" htmlFor="rep-desde">
          <Input
            id="rep-desde"
            type="date"
            value={desde}
            max={hasta || undefined}
            onChange={(e) => setDesde(e.target.value)}
            className="w-40"
          />
        </Field>
        <Field label="Hasta" htmlFor="rep-hasta">
          <Input
            id="rep-hasta"
            type="date"
            value={hasta}
            min={desde || undefined}
            onChange={(e) => setHasta(e.target.value)}
            className="w-40"
          />
        </Field>
        <Field label="Producto" htmlFor="rep-producto">
          <Select id="rep-producto" value={productoId} onChange={(e) => setProductoId(e.target.value)} className="w-64">
            <option value="">Todos los productos</option>
            {(productos ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {isLoading ? (
        <LoadingState label="Cargando reporte…" />
      ) : error ? (
        <ErrorBanner message={getErrorMessage(error)} onRetry={() => mutate()} />
      ) : !filas || filas.length === 0 ? (
        <EmptyState
          title="No hay ventas en el período"
          description="Ajustá las fechas o el filtro de producto para ver datos."
        />
      ) : (
        <>
          {totales && (
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-line bg-surface px-4 py-3">
                <p className="text-xs text-muted">Ingresos</p>
                <p className="text-lg font-semibold tabular-nums">{formatMoney(totales.ingresos)}</p>
              </div>
              <div className="rounded-xl border border-line bg-surface px-4 py-3">
                <p className="text-xs text-muted">Costo</p>
                <p className="text-lg font-semibold tabular-nums">{formatMoney(totales.costo)}</p>
              </div>
              <div className="rounded-xl border border-line bg-surface px-4 py-3">
                <p className="text-xs text-muted">Ganancia</p>
                <p className="text-lg font-semibold tabular-nums text-success">{formatMoney(totales.ganancia)}</p>
              </div>
              <div className="rounded-xl border border-line bg-surface px-4 py-3">
                <p className="text-xs text-muted">Meses con ventas</p>
                <p className="text-lg font-semibold tabular-nums">{porMes.length}</p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-6">
            {porMes.map(([mes, rows]) => {
              const mesTotales = acumular(rows);
              return (
                <section key={mes} aria-labelledby={`mes-${mes}`} className="overflow-hidden rounded-xl border border-line bg-surface">
                  <div className="flex items-center justify-between gap-3 border-b border-line bg-background/60 px-4 py-3">
                    <h2 id={`mes-${mes}`} className="text-sm font-semibold">
                      {labelMes(mes)}
                    </h2>
                    <span className="text-xs text-muted tabular-nums">
                      {rows.length} {rows.length === 1 ? "producto" : "productos"}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                        <tr>
                          <th scope="col" className="px-4 py-2.5 font-medium">Producto</th>
                          <th scope="col" className="px-4 py-2.5 text-right font-medium">Cantidad</th>
                          <th scope="col" className="px-4 py-2.5 text-right font-medium">Ingresos</th>
                          <th scope="col" className="px-4 py-2.5 text-right font-medium">Costo</th>
                          <th scope="col" className="px-4 py-2.5 text-right font-medium">Ganancia</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {rows.map((f, i) => (
                          <tr key={`${mes}-${f.productoId ?? "sin"}-${i}`}>
                            <td className="px-4 py-2.5">{f.producto}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums">
                              {numFormatter.format(toNumber(f.cantidad))} {f.unidad}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums">{formatMoney(f.ingresos)}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums">{formatMoney(f.costo)}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums">{formatMoney(f.ganancia)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t border-line bg-background/40 font-semibold">
                        <tr>
                          <td className="px-4 py-2.5 text-right">Total {labelMes(mes)}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums" />
                          <td className="px-4 py-2.5 text-right tabular-nums">{formatMoney(mesTotales.ingresos)}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">{formatMoney(mesTotales.costo)}</td>
                          <td className={cn("px-4 py-2.5 text-right tabular-nums", mesTotales.ganancia < 0 && "text-danger")}>
                            {formatMoney(mesTotales.ganancia)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
