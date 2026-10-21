import { Fragment, useState } from "react";
import { Check, ChevronDown, ChevronRight, Copy } from "lucide-react";
import { api, getErrorMessage } from "@/api/client";
import { SortControl, SortableHeader } from "@/components/SortableHeader";
import { Badge, Button, ConfirmDialog, EmptyState, ErrorBanner, Field, Input, Modal } from "@/components/ui";
import { cn, formatDate, formatMoney, toDateInput, toNumber } from "@/lib/format";
import { sortItems, type SortType } from "@/lib/sort";
import { useUrlParams, useUrlSort } from "@/lib/url-state";
import type { Cliente, Pedido } from "@/types";
import { estadoInfo } from "./estados";

type Grupo = {
  clienteId: number;
  pedidos: Pedido[];
  total: number;
  dias: number;
};

const SORT_FIELDS = [
  { key: "total", label: "Total adeudado" },
  { key: "cliente", label: "Cliente" },
  { key: "cantidad", label: "Pedidos" },
  { key: "dias", label: "Antigüedad" },
];

const SORT_TYPES: Record<string, SortType> = {
  total: "numero",
  cliente: "texto",
  cantidad: "numero",
  dias: "numero",
};

function sortValueOf(g: Grupo, key: string, clientesById: Map<number, Cliente>): unknown {
  if (key === "cliente") return clientesById.get(g.clienteId)?.nombre ?? "";
  if (key === "cantidad") return g.pedidos.length;
  if (key === "dias") return g.dias;
  return g.total;
}

function waLink(telefono: string | null | undefined, texto: string): string | null {
  const digits = (telefono ?? "").replace(/\D/g, "");
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(texto)}`;
}

function textoRecordatorio(nombre: string, g: Grupo): string {
  const ids = g.pedidos.map((p) => p.id);
  const pedido =
    ids.length === 1
      ? `el pedido #${ids[0]}`
      : `los pedidos #${ids.slice(0, -1).join(", #")} y #${ids[ids.length - 1]}`;
  return `Hola ${nombre}, te escribo de Media Resma por ${pedido}: tenés un saldo pendiente de ${formatMoney(g.total)}.`;
}

export function DeudasTab({
  pedidos,
  clientesById,
  onOpen,
  onChanged,
}: {
  pedidos: Pedido[];
  clientesById: Map<number, Cliente>;
  onOpen: (pedido: Pedido) => void;
  onChanged: () => void;
}) {
  const { params, update } = useUrlParams();
  const incluirCurso = params.get("curso") === "1";
  const { key: sortKey, dir: sortDir, setSort } = useUrlSort({ key: "total", dir: "desc" });

  const [abierto, setAbierto] = useState<Set<number>>(new Set());
  const [pagoPedido, setPagoPedido] = useState<Pedido | null>(null);
  const [monto, setMonto] = useState("");
  const [pagoError, setPagoError] = useState<string | null>(null);
  const [confirmarPagado, setConfirmarPagado] = useState<Pedido | null>(null);
  const [accionError, setAccionError] = useState<string | null>(null);
  const [pagando, setPagando] = useState(false);
  const [copiado, setCopiado] = useState<number | null>(null);

  const conDeuda = pedidos.filter((p) => p.estado !== "CANCELADO" && toNumber(p.restaPagar) > 0);
  const incluidos = incluirCurso
    ? conDeuda
    : conDeuda.filter((p) => p.estado === "LISTO" || p.estado === "ENTREGADO");

  const mapa = new Map<number, Grupo>();
  for (const p of incluidos) {
    const g = mapa.get(p.clienteId) ?? { clienteId: p.clienteId, pedidos: [], total: 0, dias: 0 };
    g.pedidos.push(p);
    g.total += toNumber(p.restaPagar);
    mapa.set(p.clienteId, g);
  }
  const ahora = Date.now();
  for (const g of mapa.values()) {
    g.pedidos.sort((a, b) => toDateInput(a.fecha).localeCompare(toDateInput(b.fecha)));
    let vieja: string | null = null;
    for (const p of g.pedidos) {
      const d = toDateInput(p.fechaEntrega ?? p.fecha);
      if (!vieja || d < vieja) vieja = d;
    }
    g.dias = vieja ? Math.max(0, Math.floor((ahora - Date.parse(`${vieja}T00:00:00.000Z`)) / 86400000)) : 0;
  }

  const effectiveKey = SORT_FIELDS.some((f) => f.key === sortKey) ? sortKey : "total";
  const grupos = sortItems(
    [...mapa.values()],
    (g) => sortValueOf(g, effectiveKey, clientesById),
    SORT_TYPES[effectiveKey] ?? "numero",
    sortDir,
  );
  const sortView = { key: effectiveKey, dir: sortDir };

  const totalAdeudado = incluidos.reduce((s, p) => s + toNumber(p.restaPagar), 0);
  const deudaVieja = grupos.filter((g) => g.dias > 30).reduce((s, g) => s + g.total, 0);

  function toggleGrupo(id: number) {
    setAbierto((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openPago(p: Pedido) {
    setAccionError(null);
    setPagoError(null);
    setMonto(String(toNumber(p.restaPagar)));
    setPagoPedido(p);
  }

  async function registrarPago() {
    if (!pagoPedido) return;
    const saldo = toNumber(pagoPedido.restaPagar);
    const valor = Number(monto);
    if (!monto || Number.isNaN(valor) || valor <= 0) {
      setPagoError("Ingresá un monto mayor a cero.");
      return;
    }
    if (valor > saldo) {
      setPagoError(`No puede superar la resta (${formatMoney(saldo)}).`);
      return;
    }
    setPagando(true);
    setPagoError(null);
    try {
      await api.post(`/pedidos/${pagoPedido.id}/pagos`, { monto: valor });
      setPagoPedido(null);
      onChanged();
    } catch (err) {
      setPagoError(getErrorMessage(err));
    } finally {
      setPagando(false);
    }
  }

  async function marcarPagado() {
    if (!confirmarPagado) return;
    setPagando(true);
    setAccionError(null);
    try {
      await api.post(`/pedidos/${confirmarPagado.id}/pagos`);
      setConfirmarPagado(null);
      onChanged();
    } catch (err) {
      setConfirmarPagado(null);
      setAccionError(getErrorMessage(err));
    } finally {
      setPagando(false);
    }
  }

  async function copiarRecordatorio(g: Grupo) {
    const nombre = clientesById.get(g.clienteId)?.nombre ?? "";
    try {
      await navigator.clipboard.writeText(textoRecordatorio(nombre, g));
      setCopiado(g.clienteId);
      window.setTimeout(() => setCopiado((c) => (c === g.clienteId ? null : c)), 2000);
    } catch {
      setAccionError("No se pudo copiar el mensaje.");
    }
  }

  const saldoPago = toNumber(pagoPedido?.restaPagar ?? 0);
  const saldoConfirmar = toNumber(confirmarPagado?.restaPagar ?? 0);

  function DetalleGrupo({ g }: { g: Grupo }) {
    const cliente = clientesById.get(g.clienteId);
    const texto = textoRecordatorio(cliente?.nombre ?? "", g);
    const wa = waLink(cliente?.telefono, texto);
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted">{cliente?.telefono ?? "Sin teléfono registrado"}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => copiarRecordatorio(g)}>
              {copiado === g.clienteId ? (
                <>
                  <Check className="size-4" aria-hidden="true" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="size-4" aria-hidden="true" />
                  Copiar recordatorio
                </>
              )}
            </Button>
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm font-medium transition-colors hover:bg-raised"
              >
                WhatsApp
              </a>
            )}
          </div>
        </div>
        {g.pedidos.map((p) => {
          const estado = estadoInfo(p.estado);
          const resta = toNumber(p.restaPagar);
          return (
            <div key={p.id} className="rounded-lg border border-line bg-background/40 px-3 py-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
                <button
                  type="button"
                  onClick={() => onOpen(p)}
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  Pedido #{p.id}
                </button>
                <Badge tone={estado.tone}>{estado.label}</Badge>
                <span className="text-muted">Entrega {p.fechaEntrega ? formatDate(p.fechaEntrega) : "—"}</span>
                <span className="ml-auto tabular-nums">Total {formatMoney(toNumber(p.sena) + resta)}</span>
                <span className="tabular-nums text-muted">Seña {formatMoney(p.sena)}</span>
                <span className="font-semibold text-danger tabular-nums">Resta {formatMoney(resta)}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Button variant="secondary" size="sm" onClick={() => openPago(p)}>
                  Registrar pago
                </Button>
                <Button variant="secondary" size="sm" onClick={() => { setAccionError(null); setConfirmarPagado(p); }}>
                  Marcar como pagado
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onOpen(p)}>
                  Ver detalle
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-surface px-4 py-3">
          <p className="text-xs text-muted">Total adeudado</p>
          <p className="text-xl font-semibold tabular-nums">{formatMoney(totalAdeudado)}</p>
        </div>
        <div className="rounded-xl border border-line bg-surface px-4 py-3">
          <p className="text-xs text-muted">Clientes con deuda</p>
          <p className="text-xl font-semibold tabular-nums">{grupos.length}</p>
        </div>
        <div className="rounded-xl border border-line bg-surface px-4 py-3">
          <p className="text-xs text-muted">Deuda &gt; 30 días</p>
          <p className="text-xl font-semibold tabular-nums text-danger">{formatMoney(deudaVieja)}</p>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm font-medium">
          <input
            type="checkbox"
            checked={incluirCurso}
            onChange={(e) => update({ curso: e.target.checked ? "1" : null })}
            className="size-4 accent-primary"
          />
          Incluir pedidos en curso
        </label>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <span>
            Mostrando {incluidos.length} de {conDeuda.length} pedidos con deuda
          </span>
          {incluirCurso && (
            <Button variant="ghost" size="sm" onClick={() => update({ curso: null })}>
              Limpiar filtros
            </Button>
          )}
        </div>
      </div>

      {accionError && (
        <div className="mb-4">
          <ErrorBanner message={accionError} onRetry={() => setAccionError(null)} />
        </div>
      )}

      {grupos.length === 0 ? (
        <EmptyState
          title={pedidos.length === 0 ? "Todavía no hay pedidos" : "No hay deudas pendientes"}
          description={
            pedidos.length === 0
              ? "Cuando haya pedidos con saldo pendiente van a aparecer acá."
              : incluirCurso
                ? "Ningún pedido con saldo pendiente."
                : "Activá «Incluir pedidos en curso» para ver más."
          }
        />
      ) : (
        <>
          <div className="mb-3">
            <SortControl fields={SORT_FIELDS} sort={sortView} onSort={setSort} />
          </div>

          <div className="hidden overflow-hidden rounded-xl border border-line bg-surface md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-background/60 text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <SortableHeader label="Cliente" sortKey="cliente" sort={sortView} onSort={setSort} />
                  <SortableHeader label="Pedidos" sortKey="cantidad" sort={sortView} onSort={setSort} />
                  <SortableHeader label="Total adeudado" sortKey="total" sort={sortView} onSort={setSort} align="right" />
                  <SortableHeader label="Antigüedad" sortKey="dias" sort={sortView} onSort={setSort} align="right" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {grupos.map((g) => {
                  const cliente = clientesById.get(g.clienteId);
                  const open = abierto.has(g.clienteId);
                  return (
                    <Fragment key={g.clienteId}>
                      <tr
                        className="cursor-pointer hover:bg-ink/5"
                        onClick={() => toggleGrupo(g.clienteId)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              aria-expanded={open}
                              aria-label={open ? `Ocultar pedidos de ${cliente?.nombre ?? ""}` : `Ver pedidos de ${cliente?.nombre ?? ""}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleGrupo(g.clienteId);
                              }}
                              className="rounded p-0.5 text-muted hover:bg-raised"
                            >
                              {open ? (
                                <ChevronDown className="size-4" aria-hidden="true" />
                              ) : (
                                <ChevronRight className="size-4" aria-hidden="true" />
                              )}
                            </button>
                            <div>
                              <p className="font-medium">{cliente?.nombre ?? `Cliente #${g.clienteId}`}</p>
                              {cliente?.telefono && <p className="text-xs text-muted">{cliente.telefono}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          {g.pedidos.length} {g.pedidos.length === 1 ? "pedido" : "pedidos"}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-danger tabular-nums">{formatMoney(g.total)}</td>
                        <td className={cn("px-4 py-3 text-right tabular-nums", g.dias > 30 ? "font-medium text-danger" : "text-muted")}>
                          {g.dias} días
                        </td>
                      </tr>
                      {open && (
                        <tr className="border-b border-line bg-background/40">
                          <td colSpan={4} className="px-4 py-3">
                            <DetalleGrupo g={g} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="flex flex-col gap-3 md:hidden">
            {grupos.map((g) => {
              const cliente = clientesById.get(g.clienteId);
              const open = abierto.has(g.clienteId);
              return (
                <li key={g.clienteId} className="rounded-xl border border-line bg-surface">
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => toggleGrupo(g.clienteId)}
                    className="flex w-full items-center gap-3 p-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{cliente?.nombre ?? `Cliente #${g.clienteId}`}</p>
                      <p className="text-xs text-muted">
                        {cliente?.telefono ? `${cliente.telefono} · ` : ""}
                        {g.pedidos.length} {g.pedidos.length === 1 ? "pedido" : "pedidos"} · {g.dias} días
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-danger tabular-nums">{formatMoney(g.total)}</span>
                      {open ? (
                        <ChevronDown className="size-4 text-muted" aria-hidden="true" />
                      ) : (
                        <ChevronRight className="size-4 text-muted" aria-hidden="true" />
                      )}
                    </div>
                  </button>
                  {open && (
                    <div className="border-t border-line px-4 py-3">
                      <DetalleGrupo g={g} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      <Modal
        open={pagoPedido !== null}
        onClose={() => setPagoPedido(null)}
        title={`Registrar pago — Pedido #${pagoPedido?.id ?? ""}`}
      >
        <p className="text-sm text-muted">
          Resta actual: <span className="font-semibold text-danger tabular-nums">{formatMoney(saldoPago)}</span>
        </p>
        <div className="mt-4">
          <Field label="Monto a cobrar" htmlFor="pago-monto" hint={`Máximo ${formatMoney(saldoPago)}`}>
            <Input
              id="pago-monto"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              max={saldoPago}
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
            />
          </Field>
        </div>
        {pagoError && (
          <div className="mt-3">
            <ErrorBanner message={pagoError} />
          </div>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setPagoPedido(null)} disabled={pagando}>
            Cancelar
          </Button>
          <Button onClick={registrarPago} loading={pagando}>
            Registrar pago
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmarPagado !== null}
        title="Marcar como pagado"
        message={`Se registrará el cobro del saldo completo (${formatMoney(saldoConfirmar)}) del pedido #${confirmarPagado?.id ?? ""}.`}
        confirmLabel="Sí, marcar como pagado"
        confirmVariant="primary"
        onConfirm={marcarPagado}
        onCancel={() => setConfirmarPagado(null)}
        loading={pagando}
      />
    </div>
  );
}
