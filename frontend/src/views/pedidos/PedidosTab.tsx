import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { Search } from "lucide-react";
import { fetcher } from "@/api/client";
import { cn, formatDate, formatMoney, toNumber } from "@/lib/format";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useUrlParams, useUrlSort } from "@/lib/url-state";
import { Badge, Button, EmptyState, Field, Input, Select } from "@/components/ui";
import { Pagination } from "@/components/Pagination";
import { SearchSelect } from "@/components/SearchSelect";
import { SortControl, SortableHeader } from "@/components/SortableHeader";
import type { Cliente, Pedido, Producto, ResumenPedidos } from "@/types";
import { ESTADOS_PEDIDO, estadoInfo, resolveEstados } from "./estados";

const ESTADOS_VALUES: string[] = ESTADOS_PEDIDO.map((e) => e.value);

const SORT_FIELDS = [
  { key: "fecha", label: "Fecha" },
  { key: "entrega", label: "Entrega" },
  { key: "cliente", label: "Cliente" },
  { key: "total", label: "Total" },
  { key: "resta", label: "Debe" },
];

export function PedidosTab({
  pedidos,
  total,
  page,
  pageSize,
  resumen,
  savingId,
  clientesById,
  productos,
  onOpen,
  onPageChange,
  onPageSizeChange,
}: {
  pedidos: Pedido[];
  total: number;
  page: number;
  pageSize: number;
  resumen?: ResumenPedidos;
  savingId?: number | null;
  clientesById: Map<number, Cliente>;
  productos: Producto[];
  onOpen: (pedido: Pedido) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const { params, update } = useUrlParams();
  const estadosParam = params.get("estados") ?? "";
  const clienteId = params.get("cliente") ?? "";
  const productoId = params.get("productoId") ?? "";
  const desde = params.get("desde") ?? "";
  const hasta = params.get("hasta") ?? "";
  const q = params.get("q") ?? "";
  const soloDeuda = params.get("deuda") === "1";
  const entrega7 = params.get("entrega7") === "1";
  const { key: sortKey, dir: sortDir, setSort } = useUrlSort({ key: "fecha", dir: "desc" });

  const estadosActivos = resolveEstados(estadosParam || null);
  const filterCount =
    (estadosParam ? 1 : 0) +
    (clienteId ? 1 : 0) +
    (productoId ? 1 : 0) +
    (desde ? 1 : 0) +
    (hasta ? 1 : 0) +
    (q ? 1 : 0) +
    (soloDeuda ? 1 : 0) +
    (entrega7 ? 1 : 0);

  const effectiveKey = SORT_FIELDS.some((f) => f.key === sortKey) ? sortKey : "fecha";
  const sortView = { key: effectiveKey, dir: sortDir };

  const [qInput, setQInput] = useState(q);
  const [sugerenciasOpen, setSugerenciasOpen] = useState(false);
  const qDebounced = useDebouncedValue(qInput, 300);
  const qActual = useRef(q);
  const primerDebounce = useRef(true);
  const { data: sugerencias } = useSWR<string[]>(
    qDebounced.trim().length >= 2
      ? `/trabajos/sugerencias?q=${encodeURIComponent(qDebounced.trim())}`
      : null,
    fetcher,
  );

  useEffect(() => {
    qActual.current = q;
    setQInput(q);
  }, [q]);

  useEffect(() => {
    if (primerDebounce.current) {
      primerDebounce.current = false;
      return;
    }
    const limpio = qDebounced.trim();
    if (limpio === qActual.current) return;
    update({ q: limpio || null, page: null });
  }, [qDebounced, update]);

  useEffect(() => {
    if (!sugerenciasOpen) return;
    function cerrar() {
      setSugerenciasOpen(false);
    }
    window.addEventListener("pointerdown", cerrar);
    return () => window.removeEventListener("pointerdown", cerrar);
  }, [sugerenciasOpen]);

  const clientes = useMemo(
    () => [...clientesById.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    [clientesById],
  );

  const productoOptions = useMemo(
    () => productos.map((p) => ({ value: String(p.id), label: p.nombre })),
    [productos],
  );

  const activos = resumen?.activos ?? 0;
  const saldoPendiente = toNumber(resumen?.saldoPendiente);

  function aplicarBusqueda(valor: string) {
    setQInput(valor);
    setSugerenciasOpen(false);
    update({ q: valor.trim() || null, page: null });
  }

  function writeEstados(list: string[]) {
    const sorted = [...list].sort();
    if (sorted.length === ESTADOS_VALUES.length) update({ estados: "TODOS", page: null });
    else if (sorted.length === 0) update({ estados: "NONE", page: null });
    else update({ estados: sorted.join(","), page: null });
  }

  function toggleEstado(value: string) {
    writeEstados(
      estadosActivos.includes(value)
        ? estadosActivos.filter((e) => e !== value)
        : [...estadosActivos, value],
    );
  }

  function clearAllFilters() {
    update({
      estados: null,
      cliente: null,
      productoId: null,
      desde: null,
      hasta: null,
      q: null,
      deuda: null,
      entrega7: null,
      page: null,
    });
  }

  function cambiarOrden(next: Parameters<typeof setSort>[0]) {
    setSort(next);
  }

  const toggleClass = (active: boolean) =>
    cn(
      "h-10 whitespace-nowrap rounded-xl border px-3 text-sm font-medium transition-colors",
      active ? "border-ink bg-ink text-background" : "border-line bg-surface hover:bg-raised",
    );

  const debeCell = (p: Pedido) => {
    const resta = toNumber(p.restaPagar);
    if (p.estado === "CANCELADO" || resta <= 0) return <span className="text-muted">—</span>;
    return <span className="font-semibold text-danger tabular-nums">{formatMoney(resta)}</span>;
  };

  const openOnKey = (p: Pedido) => (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen(p);
    }
  };

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:max-w-md">
        <div className="rounded-xl border border-line bg-surface px-4 py-3">
          <p className="text-xs text-muted">Pedidos activos</p>
          <p className="text-xl font-semibold tabular-nums">{activos}</p>
        </div>
        <div className="rounded-xl border border-line bg-surface px-4 py-3">
          <p className="text-xs text-muted">Saldo por cobrar</p>
          <p className="text-xl font-semibold tabular-nums">{formatMoney(saldoPendiente)}</p>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por estado">
        <span className="text-xs text-muted">Estado:</span>
        {ESTADOS_PEDIDO.map((e) => (
          <button
            key={e.value}
            type="button"
            onClick={() => toggleEstado(e.value)}
            aria-pressed={estadosActivos.includes(e.value)}
            className={cn(
              "whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              estadosActivos.includes(e.value)
                ? "border-ink bg-ink text-background"
                : "border-line bg-surface hover:bg-raised",
            )}
          >
            {e.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => update({ estados: "TODOS", page: null })}
          aria-pressed={estadosActivos.length === ESTADOS_VALUES.length}
          className={cn(
            "whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
            estadosActivos.length === ESTADOS_VALUES.length
              ? "border-ink bg-ink text-background"
              : "border-line bg-surface hover:bg-raised",
          )}
        >
          Todos
        </button>
      </div>

      <div className="mb-3 flex flex-wrap items-end gap-3">
        <div className="w-full max-w-sm">
          <Field label="Buscar" htmlFor="pedidos-buscar">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
                aria-hidden="true"
              />
              <Input
                id="pedidos-buscar"
                value={qInput}
                onChange={(e) => {
                  setQInput(e.target.value);
                  setSugerenciasOpen(true);
                }}
                onFocus={() => setSugerenciasOpen(true)}
                onPointerDown={(e) => e.stopPropagation()}
                placeholder="Cliente, trabajo o producto…"
                className="pl-9"
                autoComplete="off"
                aria-autocomplete="list"
                aria-expanded={sugerenciasOpen && Boolean(sugerencias?.length)}
              />
              {sugerenciasOpen && sugerencias && sugerencias.length > 0 && (
                <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-line bg-surface py-1 shadow-lg">
                  {sugerencias.map((sugerencia) => (
                    <li key={sugerencia}>
                      <button
                        type="button"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          aplicarBusqueda(sugerencia);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-raised focus-visible:bg-raised focus-visible:outline-none"
                      >
                        {sugerencia}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Field>
        </div>
        <Field label="Cliente" htmlFor="pedidos-cliente">
          <Select
            id="pedidos-cliente"
            value={clienteId}
            onChange={(e) => update({ cliente: e.target.value, page: null })}
            className="w-52"
          >
            <option value="">Todos</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Producto" htmlFor="pedidos-producto">
          <div className="w-52">
            <SearchSelect
              id="pedidos-producto"
              options={productoOptions}
              value={productoId}
              onChange={(value) => update({ productoId: value, page: null })}
              placeholder="Buscar producto…"
              emptyLabel="Todos los productos"
              clearable
            />
          </div>
        </Field>
        <Field label="Desde" htmlFor="pedidos-desde">
          <Input
            id="pedidos-desde"
            type="date"
            value={desde}
            max={hasta || undefined}
            onChange={(e) => update({ desde: e.target.value, page: null })}
            className="w-40"
          />
        </Field>
        <Field label="Hasta" htmlFor="pedidos-hasta">
          <Input
            id="pedidos-hasta"
            type="date"
            value={hasta}
            min={desde || undefined}
            onChange={(e) => update({ hasta: e.target.value, page: null })}
            className="w-40"
          />
        </Field>
        <button
          type="button"
          onClick={() => update({ deuda: soloDeuda ? null : "1", page: null })}
          aria-pressed={soloDeuda}
          className={toggleClass(soloDeuda)}
        >
          Con deuda
        </button>
        <button
          type="button"
          onClick={() => update({ entrega7: entrega7 ? null : "1", page: null })}
          aria-pressed={entrega7}
          className={toggleClass(entrega7)}
        >
          Entrega en 7 días
        </button>
      </div>

      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div className="w-full max-w-xs">
          <SortControl fields={SORT_FIELDS} sort={sortView} onSort={cambiarOrden} />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <span className="tabular-nums">{total} pedidos</span>
          {filterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              Limpiar filtros
            </Button>
          )}
        </div>
      </div>

      {pedidos.length === 0 ? (
        <EmptyState
          title={
            total === 0 && filterCount === 0
              ? "Todavía no hay pedidos"
              : "No hay pedidos con este filtro"
          }
          description={
            total === 0 && filterCount === 0
              ? "Creá el primer pedido para empezar."
              : "Probá con otros filtros."
          }
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-line bg-surface md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-background/60 text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <SortableHeader label="Fecha" sortKey="fecha" sort={sortView} onSort={cambiarOrden} />
                  <SortableHeader label="Cliente" sortKey="cliente" sort={sortView} onSort={cambiarOrden} />
                  <th scope="col" className="px-4 py-3 font-medium">Estado</th>
                  <SortableHeader label="Entrega" sortKey="entrega" sort={sortView} onSort={cambiarOrden} />
                  <SortableHeader label="Total" sortKey="total" sort={sortView} onSort={cambiarOrden} align="right" />
                  <SortableHeader label="Debe" sortKey="resta" sort={sortView} onSort={cambiarOrden} align="right" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {pedidos.map((p) => {
                  const estado = estadoInfo(p.estado);
                  const guardando = savingId === p.id;
                  return (
                    <tr
                      key={p.id}
                      tabIndex={guardando ? -1 : 0}
                      aria-busy={guardando}
                      onClick={() => {
                        if (!guardando) onOpen(p);
                      }}
                      onKeyDown={guardando ? undefined : openOnKey(p)}
                      className={cn(
                        "cursor-pointer hover:bg-ink/5 focus-visible:bg-ink/5 focus-visible:outline-none",
                        guardando && "pointer-events-none opacity-60",
                      )}
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium">#{p.id}</span>
                        <span className="ml-2 text-muted">{formatDate(p.fecha)}</span>
                      </td>
                      <td className="px-4 py-3">
                        {clientesById.get(p.clienteId)?.nombre ?? `Cliente #${p.clienteId}`}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={estado.tone}>{estado.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {p.fechaEntrega ? formatDate(p.fechaEntrega) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatMoney(toNumber(p.sena) + toNumber(p.restaPagar))}
                      </td>
                      <td className="px-4 py-3 text-right">{debeCell(p)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="flex flex-col gap-3 md:hidden">
            {pedidos.map((p) => {
              const estado = estadoInfo(p.estado);
              const resta = toNumber(p.restaPagar);
              const guardando = savingId === p.id;
              return (
                <li key={p.id} className={cn("rounded-xl border border-line bg-surface p-4", guardando && "opacity-60")}>
                  <button
                    type="button"
                    disabled={guardando}
                    aria-busy={guardando}
                    onClick={() => onOpen(p)}
                    className="flex w-full items-start gap-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">
                          {clientesById.get(p.clienteId)?.nombre ?? `Cliente #${p.clienteId}`}
                        </span>
                        <Badge tone={estado.tone}>{estado.label}</Badge>
                        {resta > 0 && p.estado !== "CANCELADO" && (
                          <Badge tone="danger">Debe {formatMoney(resta)}</Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-muted">
                        #{p.id} · {formatDate(p.fecha)}
                        {p.fechaEntrega && ` · Entrega ${formatDate(p.fechaEntrega)}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted">Total</p>
                      <p className="font-semibold tabular-nums">
                        {formatMoney(toNumber(p.sena) + resta)}
                      </p>
                      <p
                        className={cn(
                          "mt-1 text-xs tabular-nums",
                          resta > 0 && p.estado !== "CANCELADO" ? "text-danger" : "text-muted",
                        )}
                      >
                        {resta > 0 && p.estado !== "CANCELADO"
                          ? `Debe ${formatMoney(resta)}`
                          : "Sin deuda"}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          <Pagination
            total={total}
            page={page}
            pageSize={pageSize}
            onPageChange={onPageChange}
            pageSizeOptions={[25, 50, 100]}
            onPageSizeChange={onPageSizeChange}
            prefix="Mostrando "
            noun={{ one: "pedido", many: "pedidos" }}
          />
        </>
      )}
    </div>
  );
}
