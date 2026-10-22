import { useMemo } from "react";
import { cn, formatDate, formatMoney, toDateInput, toNumber } from "@/lib/format";
import { sortItems, type SortType } from "@/lib/sort";
import { useUrlParams, useUrlSort } from "@/lib/url-state";
import { Badge, Button, EmptyState, Field, Input, Select } from "@/components/ui";
import { SearchSelect } from "@/components/SearchSelect";
import { SortControl, SortableHeader } from "@/components/SortableHeader";
import type { Cliente, Pedido, Producto } from "@/types";
import { ESTADOS_PEDIDO, estadoInfo } from "./estados";

const ESTADOS_VALUES: string[] = ESTADOS_PEDIDO.map((e) => e.value);
const DEFAULT_ACTIVOS = ["PENDIENTE", "EN_PROCESO", "LISTO"];

const SORT_FIELDS = [
  { key: "fecha", label: "Fecha" },
  { key: "entrega", label: "Entrega" },
  { key: "cliente", label: "Cliente" },
  { key: "total", label: "Total" },
  { key: "resta", label: "Debe" },
];

function sortValueOf(p: Pedido, key: string, clientesById: Map<number, Cliente>): unknown {
  if (key === "entrega") return p.fechaEntrega;
  if (key === "cliente") return clientesById.get(p.clienteId)?.nombre ?? "";
  if (key === "total") return toNumber(p.sena) + toNumber(p.restaPagar);
  if (key === "resta") return toNumber(p.restaPagar);
  return p.fecha;
}

const SORT_TYPES: Record<string, SortType> = {
  fecha: "fecha",
  entrega: "fecha",
  cliente: "texto",
  total: "numero",
  resta: "numero",
};

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function resolveEstados(param: string): string[] {
  if (param === "TODOS") return [...ESTADOS_VALUES];
  if (param === "NONE") return [];
  if (param) return param.split(",").filter((s) => ESTADOS_VALUES.includes(s));
  return [...DEFAULT_ACTIVOS];
}

const esDefault = (list: string[]) =>
  list.length === DEFAULT_ACTIVOS.length && DEFAULT_ACTIVOS.every((e) => list.includes(e));

export function PedidosTab({
  pedidos,
  clientesById,
  productos,
  onOpen,
}: {
  pedidos: Pedido[];
  clientesById: Map<number, Cliente>;
  productos: Producto[];
  onOpen: (pedido: Pedido) => void;
}) {
  const { params, update } = useUrlParams();
  const estadosParam = params.get("estados") ?? "";
  const clienteId = params.get("cliente") ?? "";
  const productoId = params.get("productoId") ?? "";
  const desde = params.get("desde") ?? "";
  const hasta = params.get("hasta") ?? "";
  const soloDeuda = params.get("deuda") === "1";
  const entrega7 = params.get("entrega7") === "1";
  const { key: sortKey, dir: sortDir, setSort } = useUrlSort({ key: "fecha", dir: "desc" });

  const estadosActivos = resolveEstados(estadosParam);
  const filterCount =
    (estadosParam ? 1 : 0) +
    (clienteId ? 1 : 0) +
    (productoId ? 1 : 0) +
    (desde ? 1 : 0) +
    (hasta ? 1 : 0) +
    (soloDeuda ? 1 : 0) +
    (entrega7 ? 1 : 0);

  const hoy = new Date().toISOString().slice(0, 10);
  const limite7 = addDaysIso(hoy, 7);

  const filtrados = pedidos.filter((p) => {
    if (!estadosActivos.includes(p.estado)) return false;
    if (clienteId && String(p.clienteId) !== clienteId) return false;
    const day = toDateInput(p.fecha);
    if (desde && day < desde) return false;
    if (hasta && day > hasta) return false;
    if (soloDeuda && !(p.estado !== "CANCELADO" && toNumber(p.restaPagar) > 0)) return false;
    if (entrega7) {
      if (!p.fechaEntrega) return false;
      const e = toDateInput(p.fechaEntrega);
      if (e < hoy || e > limite7) return false;
    }
    return true;
  });

  const effectiveKey = SORT_FIELDS.some((f) => f.key === sortKey) ? sortKey : "fecha";
  const ordered = sortItems(
    filtrados,
    (p) => sortValueOf(p, effectiveKey, clientesById),
    SORT_TYPES[effectiveKey] ?? "fecha",
    sortDir,
  );
  const sortView = { key: effectiveKey, dir: sortDir };

  const clientes = useMemo(
    () => [...clientesById.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    [clientesById],
  );

  const productoOptions = useMemo(
    () => productos.map((p) => ({ value: String(p.id), label: p.nombre })),
    [productos],
  );

  const activos = pedidos.filter((p) => p.estado !== "ENTREGADO" && p.estado !== "CANCELADO").length;
  const saldoPendiente = pedidos.filter((p) => p.estado !== "CANCELADO").reduce((s, p) => s + toNumber(p.restaPagar), 0);

  function writeEstados(list: string[]) {
    const sorted = [...list].sort();
    if (sorted.length === ESTADOS_VALUES.length) update({ estados: "TODOS" });
    else if (esDefault(sorted)) update({ estados: null });
    else if (sorted.length === 0) update({ estados: "NONE" });
    else update({ estados: sorted.join(",") });
  }

  function toggleEstado(value: string) {
    writeEstados(estadosActivos.includes(value) ? estadosActivos.filter((e) => e !== value) : [...estadosActivos, value]);
  }

  function clearAllFilters() {
    update({ estados: null, cliente: null, productoId: null, desde: null, hasta: null, deuda: null, entrega7: null });
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
              estadosActivos.includes(e.value) ? "border-ink bg-ink text-background" : "border-line bg-surface hover:bg-raised",
            )}
          >
            {e.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => update({ estados: "TODOS" })}
          aria-pressed={estadosActivos.length === ESTADOS_VALUES.length}
          className={cn(
            "whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
            estadosActivos.length === ESTADOS_VALUES.length ? "border-ink bg-ink text-background" : "border-line bg-surface hover:bg-raised",
          )}
        >
          Todos
        </button>
      </div>

      <div className="mb-3 flex flex-wrap items-end gap-3">
        <Field label="Cliente" htmlFor="pedidos-cliente">
          <Select id="pedidos-cliente" value={clienteId} onChange={(e) => update({ cliente: e.target.value })} className="w-52">
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
              onChange={(value) => update({ productoId: value })}
              placeholder="Buscar producto…"
              emptyLabel="Todos los productos"
              clearable
            />
          </div>
        </Field>
        <Field label="Desde" htmlFor="pedidos-desde">
          <Input id="pedidos-desde" type="date" value={desde} max={hasta || undefined} onChange={(e) => update({ desde: e.target.value })} className="w-40" />
        </Field>
        <Field label="Hasta" htmlFor="pedidos-hasta">
          <Input id="pedidos-hasta" type="date" value={hasta} min={desde || undefined} onChange={(e) => update({ hasta: e.target.value })} className="w-40" />
        </Field>
        <button type="button" onClick={() => update({ deuda: soloDeuda ? null : "1" })} aria-pressed={soloDeuda} className={toggleClass(soloDeuda)}>
          Con deuda
        </button>
        <button type="button" onClick={() => update({ entrega7: entrega7 ? null : "1" })} aria-pressed={entrega7} className={toggleClass(entrega7)}>
          Entrega en 7 días
        </button>
      </div>

      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div className="w-full max-w-xs">
          <SortControl fields={SORT_FIELDS} sort={sortView} onSort={setSort} />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <span>
            Mostrando {filtrados.length} de {pedidos.length}
          </span>
          {filterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              Limpiar filtros
            </Button>
          )}
        </div>
      </div>

      {filtrados.length === 0 ? (
        <EmptyState
          title={pedidos.length ? "No hay pedidos con este filtro" : "Todavía no hay pedidos"}
          description={pedidos.length ? "Probá con otros filtros." : "Creá el primer pedido para empezar."}
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-line bg-surface md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-background/60 text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <SortableHeader label="Fecha" sortKey="fecha" sort={sortView} onSort={setSort} />
                  <SortableHeader label="Cliente" sortKey="cliente" sort={sortView} onSort={setSort} />
                  <th scope="col" className="px-4 py-3 font-medium">Estado</th>
                  <SortableHeader label="Entrega" sortKey="entrega" sort={sortView} onSort={setSort} />
                  <SortableHeader label="Total" sortKey="total" sort={sortView} onSort={setSort} align="right" />
                  <SortableHeader label="Debe" sortKey="resta" sort={sortView} onSort={setSort} align="right" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {ordered.map((p) => {
                  const estado = estadoInfo(p.estado);
                  return (
                    <tr
                      key={p.id}
                      tabIndex={0}
                      onClick={() => onOpen(p)}
                      onKeyDown={openOnKey(p)}
                      className="cursor-pointer hover:bg-ink/5 focus-visible:bg-ink/5 focus-visible:outline-none"
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium">#{p.id}</span>
                        <span className="ml-2 text-muted">{formatDate(p.fecha)}</span>
                      </td>
                      <td className="px-4 py-3">{clientesById.get(p.clienteId)?.nombre ?? `Cliente #${p.clienteId}`}</td>
                      <td className="px-4 py-3"><Badge tone={estado.tone}>{estado.label}</Badge></td>
                      <td className="px-4 py-3 text-muted">{p.fechaEntrega ? formatDate(p.fechaEntrega) : "—"}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatMoney(toNumber(p.sena) + toNumber(p.restaPagar))}</td>
                      <td className="px-4 py-3 text-right">{debeCell(p)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="flex flex-col gap-3 md:hidden">
            {ordered.map((p) => {
              const estado = estadoInfo(p.estado);
              const resta = toNumber(p.restaPagar);
              return (
                <li key={p.id} className="rounded-xl border border-line bg-surface p-4">
                  <button
                    type="button"
                    onClick={() => onOpen(p)}
                    className="flex w-full items-start gap-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{clientesById.get(p.clienteId)?.nombre ?? `Cliente #${p.clienteId}`}</span>
                        <Badge tone={estado.tone}>{estado.label}</Badge>
                        {resta > 0 && p.estado !== "CANCELADO" && <Badge tone="danger">Debe {formatMoney(resta)}</Badge>}
                      </div>
                      <p className="mt-0.5 text-sm text-muted">
                        #{p.id} · {formatDate(p.fecha)}
                        {p.fechaEntrega && ` · Entrega ${formatDate(p.fechaEntrega)}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted">Total</p>
                      <p className="font-semibold tabular-nums">{formatMoney(toNumber(p.sena) + resta)}</p>
                      <p className={cn("mt-1 text-xs tabular-nums", resta > 0 && p.estado !== "CANCELADO" ? "text-danger" : "text-muted")}>
                        {resta > 0 && p.estado !== "CANCELADO" ? `Debe ${formatMoney(resta)}` : "Sin deuda"}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
