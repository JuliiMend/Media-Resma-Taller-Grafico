import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { api, fetcher, getErrorMessage } from "@/api/client";
import { cn } from "@/lib/format";
import { Button, ConfirmDialog, ErrorBanner, LoadingState, PageHeader } from "@/components/ui";
import type { Cliente, PaginaPedidos, Pedido, Producto, ResumenPedidos } from "@/types";
import { DeudasTab } from "./DeudasTab";
import { PedidoDetailModal } from "./PedidoDetailModal";
import { PedidoFormModal } from "./PedidoFormModal";
import { PedidosTab } from "./PedidosTab";
import { resolveEstados } from "./estados";

const PAGE_SIZES = [25, 50, 100];

export function PedidosPage() {
  const [params, setParams] = useSearchParams();
  const vista = params.get("vista") === "deudas" ? "deudas" : "pedidos";

  const pageParam = Math.trunc(Number(params.get("page")));
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
  const pageSizeParam = Math.trunc(Number(params.get("pageSize")));
  const pageSize = PAGE_SIZES.includes(pageSizeParam) ? pageSizeParam : 25;

  const estadosParam = params.get("estados");
  const estados = resolveEstados(estadosParam);

  const pedidosKey = useMemo(() => {
    const query = new URLSearchParams();
    const estadosQuery =
      estadosParam === "TODOS" ? null : estadosParam === "NONE" ? "NONE" : estados.join(",");

    if (estadosQuery) query.set("estados", estadosQuery);
    for (const clave of [
      "cliente",
      "productoId",
      "desde",
      "hasta",
      "q",
      "deuda",
      "entrega7",
      "orden",
      "dir",
    ]) {
      const valor = params.get(clave);
      if (valor) query.set(clave, valor);
    }
    query.set("page", String(page));
    query.set("pageSize", String(pageSize));
    return `/pedidos?${query.toString()}`;
  }, [estados, estadosParam, page, pageSize, params]);

  const {
    data: pagina,
    error,
    isLoading,
    mutate: mutatePedidos,
  } = useSWR<PaginaPedidos>(vista === "pedidos" ? pedidosKey : null, fetcher);
  const {
    data: deudas,
    error: deudasError,
    isLoading: deudasLoading,
    mutate: mutateDeudas,
  } = useSWR<Pedido[]>(vista === "deudas" ? "/pedidos" : null, fetcher);
  const { data: resumen, mutate: mutateResumen } = useSWR<ResumenPedidos>(
    "/pedidos/resumen",
    fetcher,
  );
  const { data: clientes } = useSWR<Cliente[]>("/clientes", fetcher);
  const { data: productos } = useSWR<Producto[]>("/productos", fetcher);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Pedido | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [toDelete, setToDelete] = useState<Pedido | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [savingEstadoId, setSavingEstadoId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const pedidoParam = params.get("pedido");

  const { data: selectedPedido, mutate: mutateSelectedPedido } = useSWR<Pedido>(
    selectedId ? `/pedidos/${selectedId}` : null,
    fetcher,
  );

  const clientesById = useMemo(
    () => new Map((clientes ?? []).map((c) => [c.id, c])),
    [clientes],
  );
  const pedidosPagina = pagina?.data ?? [];
  const list = vista === "deudas" ? (deudas ?? []) : pedidosPagina;
  const selected =
    selectedPedido ?? list.find((pedido) => pedido.id === selectedId) ?? null;

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

  useEffect(() => {
    if (!pagina || pagina.total === 0) return;
    const ultimaPagina = Math.max(1, Math.ceil(pagina.total / pageSize));
    if (page <= ultimaPagina) return;
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (ultimaPagina === 1) next.delete("page");
        else next.set("page", String(ultimaPagina));
        return next;
      },
      { replace: true },
    );
  }, [pagina, page, pageSize, setParams]);

  function refrescar() {
    void mutatePedidos();
    void mutateDeudas();
    void mutateResumen();
    void mutateSelectedPedido();
  }

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

  function cambiarPagina(next: number) {
    setParams(
      (prev) => {
        const nextParams = new URLSearchParams(prev);
        if (next <= 1) nextParams.delete("page");
        else nextParams.set("page", String(next));
        return nextParams;
      },
      { replace: true },
    );
  }

  function cambiarPageSize(next: number) {
    setParams(
      (prev) => {
        const nextParams = new URLSearchParams(prev);
        nextParams.set("pageSize", String(next));
        nextParams.delete("page");
        return nextParams;
      },
      { replace: true },
    );
  }

  async function cambiarEstado(
    pedidoId: number,
    nuevoEstado: string,
    cobrar: boolean,
  ) {
    const enPagina = pedidosPagina.find((pedido) => pedido.id === pedidoId);
    const estadoAnterior =
      enPagina?.estado ??
      (selectedPedido?.id === pedidoId ? selectedPedido.estado : undefined);

    setActionError(null);
    setSavingEstadoId(pedidoId);

    try {
      if (vista === "pedidos") {
        await mutatePedidos(
          (actual) =>
            actual
              ? {
                  ...actual,
                  data: actual.data.map((pedido) =>
                    pedido.id === pedidoId ? { ...pedido, estado: nuevoEstado } : pedido,
                  ),
                }
              : actual,
          { revalidate: false },
        );
      } else {
        await mutateDeudas(
          (actual) =>
            actual
              ? actual.map((pedido) =>
                  pedido.id === pedidoId ? { ...pedido, estado: nuevoEstado } : pedido,
                )
              : actual,
          { revalidate: false },
        );
      }
      await mutateSelectedPedido(
        (actual) =>
          actual && actual.id === pedidoId ? { ...actual, estado: nuevoEstado } : actual,
        { revalidate: false },
      );

      if (cobrar) await api.post(`/pedidos/${pedidoId}/pagos`);
      await api.patch(`/pedidos/${pedidoId}`, { estado: nuevoEstado });

      void mutatePedidos();
      void mutateDeudas();
      void mutateSelectedPedido();
      void mutateResumen();
    } catch (err) {
      if (estadoAnterior !== undefined) {
        if (vista === "pedidos") {
          await mutatePedidos(
            (actual) =>
              actual
                ? {
                    ...actual,
                    data: actual.data.map((pedido) =>
                      pedido.id === pedidoId
                        ? { ...pedido, estado: estadoAnterior }
                        : pedido,
                    ),
                  }
                : actual,
            { revalidate: false },
          );
        } else {
          await mutateDeudas(
            (actual) =>
              actual
                ? actual.map((pedido) =>
                    pedido.id === pedidoId
                      ? { ...pedido, estado: estadoAnterior }
                      : pedido,
                  )
                : actual,
            { revalidate: false },
          );
        }
        await mutateSelectedPedido(
          (actual) =>
            actual && actual.id === pedidoId
              ? { ...actual, estado: estadoAnterior }
              : actual,
          { revalidate: false },
        );
      }
      setActionError(getErrorMessage(err));
      throw err;
    } finally {
      setSavingEstadoId(null);
    }
  }

  async function handleDelete() {
    if (!toDelete) return;
    setDeleting(true);
    setActionError(null);
    try {
      await api.delete(`/pedidos/${toDelete.id}`);
      setSelectedId(null);
      refrescar();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  }

  const deudaCount = resumen?.conDeuda ?? 0;
  const tabs = [
    { value: "pedidos" as const, label: "Pedidos" },
    {
      value: "deudas" as const,
      label: deudaCount > 0 ? `Deudas (${deudaCount})` : "Deudas",
    },
  ];

  const cargando = vista === "deudas" ? deudasLoading : isLoading;
  const errorVista = vista === "deudas" ? deudasError : error;
  const reintentar = () => {
    if (vista === "deudas") void mutateDeudas();
    else void mutatePedidos();
  };

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

      <div
        className="mb-6 flex gap-1 rounded-xl border border-line bg-surface p-1"
        role="tablist"
        aria-label="Vista de pedidos"
      >
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={vista === tab.value}
            onClick={() => cambiarVista(tab.value)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
              vista === tab.value
                ? "bg-ink text-background"
                : "text-muted hover:bg-ink/5 hover:text-ink",
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

      {cargando ? (
        <LoadingState />
      ) : errorVista ? (
        <ErrorBanner message={getErrorMessage(errorVista)} onRetry={reintentar} />
      ) : vista === "deudas" ? (
        <DeudasTab
          pedidos={list}
          clientesById={clientesById}
          onOpen={(p) => setSelectedId(p.id)}
          onChanged={refrescar}
        />
      ) : (
        <PedidosTab
          pedidos={pedidosPagina}
          total={pagina?.total ?? 0}
          page={page}
          pageSize={pageSize}
          resumen={resumen}
          savingId={savingEstadoId}
          clientesById={clientesById}
          productos={productos ?? []}
          onOpen={(p) => setSelectedId(p.id)}
          onPageChange={cambiarPagina}
          onPageSizeChange={cambiarPageSize}
        />
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
          refrescar();
        }}
        clientes={clientes ?? []}
        productos={productos ?? []}
        pedido={editing}
      />

      <PedidoDetailModal
        pedido={selected}
        cliente={selected ? clientesById.get(selected.clienteId) : undefined}
        productos={productos ?? []}
        savingEstadoPedido={selected ? savingEstadoId === selected.id : false}
        onClose={() => setSelectedId(null)}
        onChanged={() => {
          refrescar();
        }}
        onCambiarEstado={cambiarEstado}
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
