import { useMemo, useState } from "react";
import useSWR from "swr";
import { ChevronRight, Plus } from "lucide-react";
import { api, fetcher, getErrorMessage } from "@/api/client";
import { cn, formatDate, formatMoney, toNumber } from "@/lib/format";
import { Badge, Button, ConfirmDialog, EmptyState, ErrorBanner, LoadingState, PageHeader } from "@/components/ui";
import type { Cliente, Pedido, Producto } from "@/types";
import { ESTADOS_PEDIDO, estadoInfo } from "./estados";
import { PedidoDetailModal } from "./PedidoDetailModal";
import { PedidoFormModal } from "./PedidoFormModal";

export function PedidosPage() {
  const { data: pedidos, error, isLoading, mutate } = useSWR<Pedido[]>("/pedidos", fetcher);
  const { data: clientes } = useSWR<Cliente[]>("/clientes", fetcher);
  const { data: productos } = useSWR<Producto[]>("/productos", fetcher);
  const [filtro, setFiltro] = useState<string>("ACTIVOS");
  const [formOpen, setFormOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [toDelete, setToDelete] = useState<Pedido | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const clientesById = useMemo(() => new Map((clientes ?? []).map((c) => [c.id, c])), [clientes]);
  const list = pedidos ?? [];
  const filtered = list.filter((p) => {
    if (filtro === "TODOS") return true;
    if (filtro === "ACTIVOS") return p.estado !== "ENTREGADO" && p.estado !== "CANCELADO";
    return p.estado === filtro;
  });
  const selected = list.find((p) => p.id === selectedId) ?? null;

  const activos = list.filter((p) => p.estado !== "ENTREGADO" && p.estado !== "CANCELADO").length;
  const saldoPendiente = list.filter((p) => p.estado !== "CANCELADO").reduce((s, p) => s + toNumber(p.restaPagar), 0);

  async function handleDelete() {
    if (!toDelete) return;
    setDeleting(true);
    setActionError(null);
    try {
      await api.delete(`/pedidos/${toDelete.id}`);
      setSelectedId(null);
      await mutate();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  }

  const filtros = [{ value: "ACTIVOS", label: "Activos" }, ...ESTADOS_PEDIDO, { value: "TODOS", label: "Todos" }];

  return (
    <div>
      <PageHeader
        title="Pedidos"
        description="Seguimiento de los pedidos del taller."
        action={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Nuevo pedido
          </Button>
        }
      />

      {pedidos && (
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
      )}

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtrar por estado">
        {filtros.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFiltro(f.value)}
            aria-pressed={filtro === f.value}
            className={cn(
              "whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              filtro === f.value ? "border-ink bg-ink text-background" : "border-line bg-surface hover:bg-raised",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {actionError && (
        <div className="mb-4">
          <ErrorBanner message={actionError} />
        </div>
      )}

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorBanner message={getErrorMessage(error)} onRetry={() => mutate()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={list.length ? "No hay pedidos con este filtro" : "Todavía no hay pedidos"}
          description={list.length ? "Probá con otro estado." : "Creá el primer pedido para empezar."}
        />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {filtered.map((p) => {
            const estado = estadoInfo(p.estado);
            const resta = toNumber(p.restaPagar);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-ink/5 focus-visible:bg-ink/5 focus-visible:outline-none"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{clientesById.get(p.clienteId)?.nombre ?? `Cliente #${p.clienteId}`}</span>
                      <Badge tone={estado.tone}>{estado.label}</Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-muted">
                      #{p.id} · {formatDate(p.fecha)}
                      {p.fechaEntrega && ` · Entrega ${formatDate(p.fechaEntrega)}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted">Resta</p>
                    <p className={cn("font-semibold tabular-nums", resta > 0 ? "text-primary" : "text-success")}>{formatMoney(resta)}</p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <PedidoFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onCreated={() => {
          setFormOpen(false);
          mutate();
        }}
        clientes={clientes ?? []}
        productos={productos ?? []}
      />

      <PedidoDetailModal
        pedido={selected}
        cliente={selected ? clientesById.get(selected.clienteId) : undefined}
        onClose={() => setSelectedId(null)}
        onChanged={() => mutate()}
        onDelete={(p) => setToDelete(p)}
      />

      <ConfirmDialog
        open={toDelete !== null}
        title="Eliminar pedido"
        message="Se eliminará el pedido. Si tiene trabajos o tareas asociadas, puede que el servidor no lo permita."
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
        loading={deleting}
      />
    </div>
  );
}
