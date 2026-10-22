import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { api, fetcher, getErrorMessage } from "@/api/client";
import { cn, toNumber } from "@/lib/format";
import { Button, ConfirmDialog, ErrorBanner, LoadingState, PageHeader } from "@/components/ui";
import type { Cliente, Pedido, Producto } from "@/types";
import { DeudasTab } from "./DeudasTab";
import { PedidoDetailModal } from "./PedidoDetailModal";
import { PedidoFormModal } from "./PedidoFormModal";
import { PedidosTab } from "./PedidosTab";

export function PedidosPage() {
  const { data: pedidos, error, isLoading, mutate } = useSWR<Pedido[]>("/pedidos", fetcher);
  const { data: clientes } = useSWR<Cliente[]>("/clientes", fetcher);
  const { data: productos } = useSWR<Producto[]>("/productos", fetcher);
  const [params, setParams] = useSearchParams();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Pedido | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [toDelete, setToDelete] = useState<Pedido | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const vista = params.get("vista") === "deudas" ? "deudas" : "pedidos";
  const pedidoParam = params.get("pedido");

  const clientesById = useMemo(() => new Map((clientes ?? []).map((c) => [c.id, c])), [clientes]);
  const list = pedidos ?? [];
  const selected = list.find((p) => p.id === selectedId) ?? null;

  useEffect(() => {
    if (!pedidoParam) return;
    const id = Number(pedidoParam);
    if (Number.isFinite(id) && id > 0) setSelectedId(id);
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("pedido");
        return next;
      },
      { replace: true },
    );
  }, [pedidoParam, setParams]);

  function cambiarVista(next: "pedidos" | "deudas") {
    setParams(
      (prev) => {
        const nextParams = new URLSearchParams(prev);
        if (next === "deudas") nextParams.set("vista", "deudas");
        else nextParams.delete("vista");
        return nextParams;
      },
      { replace: true },
    );
  }

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

  const deudaCount = list.filter((p) => p.estado !== "CANCELADO" && toNumber(p.restaPagar) > 0).length;
  const tabs = [
    { value: "pedidos" as const, label: "Pedidos" },
    { value: "deudas" as const, label: deudaCount > 0 ? `Deudas (${deudaCount})` : "Deudas" },
  ];

  return (
    <div>
      <PageHeader
        title="Pedidos"
        description="Seguimiento de los pedidos y las deudas del taller."
        action={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Nuevo pedido
          </Button>
        }
      />

      <div className="mb-6 flex gap-1 rounded-xl border border-line bg-surface p-1" role="tablist" aria-label="Vista de pedidos">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={vista === tab.value}
            onClick={() => cambiarVista(tab.value)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
              vista === tab.value ? "bg-ink text-background" : "text-muted hover:bg-ink/5 hover:text-ink",
            )}
          >
            {tab.label}
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
      ) : vista === "deudas" ? (
        <DeudasTab
          pedidos={list}
          clientesById={clientesById}
          onOpen={(p) => setSelectedId(p.id)}
          onChanged={() => void mutate()}
        />
      ) : (
        <PedidosTab pedidos={list} clientesById={clientesById} onOpen={(p) => setSelectedId(p.id)} />
      )}

      <PedidoFormModal
        open={formOpen || editing !== null}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onCreated={() => {
          setFormOpen(false);
          setEditing(null);
          void mutate();
        }}
        clientes={clientes ?? []}
        productos={productos ?? []}
        pedido={editing}
      />

      <PedidoDetailModal
        pedido={selected}
        cliente={selected ? clientesById.get(selected.clienteId) : undefined}
        productos={productos ?? []}
        onClose={() => setSelectedId(null)}
        onChanged={async () => {
          await mutate();
        }}
        onDelete={(p) => setToDelete(p)}
        onEdit={(p) => setEditing(p)}
      />

      <ConfirmDialog
        open={toDelete !== null}
        title="Eliminar pedido"
        message="Se borra el pedido y sus trabajos. No se puede deshacer."
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
        loading={deleting}
      />
    </div>
  );
}
