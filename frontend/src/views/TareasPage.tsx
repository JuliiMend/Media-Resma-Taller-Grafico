import { useState, type FormEvent } from "react";
import useSWR from "swr";
import { CalendarClock, Plus, Trash2 } from "lucide-react";
import { api, fetcher, getErrorMessage } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { cn, formatDate } from "@/lib/format";
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  Field,
  Input,
  LoadingState,
  Modal,
  PageHeader,
  Select,
  Textarea,
} from "@/components/ui";
import type { Pedido, Tarea } from "@/types";

const DONE = "COMPLETADA";

export function TareasPage() {
  const { user } = useAuth();
  const { data, error, isLoading, mutate } = useSWR<Tarea[]>("/tareas", fetcher);
  const { data: pedidos } = useSWR<Pedido[]>("/pedidos", fetcher);
  const [formOpen, setFormOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fechaLimite, setFechaLimite] = useState("");
  const [pedidoId, setPedidoId] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Tarea | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());

  const tareas = data ?? [];
  const pendientes = tareas.filter((t) => t.estado !== DONE);
  const completadas = tareas.filter((t) => t.estado === DONE);

  function openForm() {
    setTitulo("");
    setDescripcion("");
    setFechaLimite("");
    setPedidoId("");
    setFormError(null);
    setFormOpen(true);
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) {
      setFormError("El título es obligatorio");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await api.post("/tareas", {
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || undefined,
        estado: "PENDIENTE",
        fechaLimite: fechaLimite ? new Date(`${fechaLimite}T00:00:00.000Z`).toISOString() : undefined,
        pedidoId: pedidoId ? Number(pedidoId) : undefined,
        usuarioId: user?.id,
      });
      await mutate();
      setFormOpen(false);
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggle(tarea: Tarea) {
    const estado = tarea.estado === DONE ? "PENDIENTE" : DONE;
    setActionError(null);
    setPendingIds((s) => new Set(s).add(tarea.id));
    try {
      await mutate(
        async (current) => {
          await api.patch(`/tareas/${tarea.id}`, { estado });
          return current?.map((t) => (t.id === tarea.id ? { ...t, estado } : t));
        },
        {
          optimisticData: (current) => (current ?? []).map((t) => (t.id === tarea.id ? { ...t, estado } : t)),
          rollbackOnError: true,
          revalidate: false,
        },
      );
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setPendingIds((s) => {
        const next = new Set(s);
        next.delete(tarea.id);
        return next;
      });
    }
  }

  async function handleDelete() {
    if (!toDelete) return;
    setDeleting(true);
    setActionError(null);
    try {
      await api.delete(`/tareas/${toDelete.id}`);
      await mutate();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  }

  function renderList(list: Tarea[]) {
    return (
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
        {list.map((t) => {
          const done = t.estado === DONE;
          const overdue = !done && t.fechaLimite && new Date(t.fechaLimite) < new Date(new Date().toISOString().slice(0, 10));
          return (
            <li key={t.id} className="flex items-start gap-3 px-4 py-3">
              <input
                type="checkbox"
                className="mt-1 size-4 shrink-0 accent-primary"
                checked={done}
                disabled={pendingIds.has(t.id)}
                onChange={() => toggle(t)}
                aria-label={done ? `Marcar "${t.titulo}" como pendiente` : `Marcar "${t.titulo}" como completada`}
              />
              <div className="min-w-0 flex-1">
                <p className={cn("font-medium", done && "text-muted line-through")}>{t.titulo}</p>
                {t.descripcion && <p className="mt-0.5 text-sm text-muted text-pretty">{t.descripcion}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {t.pedidoId && <Badge tone="primary">Pedido #{t.pedidoId}</Badge>}
                  {t.fechaLimite && (
                    <Badge tone={overdue ? "danger" : "neutral"}>
                      <CalendarClock className="mr-1 size-3" aria-hidden="true" />
                      {formatDate(t.fechaLimite)}
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setToDelete(t)}
                aria-label={`Eliminar "${t.titulo}"`}
                className="text-danger hover:bg-danger-soft"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div>
      <PageHeader
        title="Tareas"
        description="Pendientes del taller, opcionalmente vinculados a un pedido."
        action={
          <Button onClick={openForm}>
            <Plus className="size-4" aria-hidden="true" />
            Nueva tarea
          </Button>
        }
      />

      {actionError && (
        <div className="mb-4">
          <ErrorBanner message={actionError} />
        </div>
      )}

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorBanner message={getErrorMessage(error)} onRetry={() => mutate()} />
      ) : tareas.length === 0 ? (
        <EmptyState title="No hay tareas" description="Creá una tarea para organizar el trabajo del taller." />
      ) : (
        <div className="flex flex-col gap-8">
          <section aria-labelledby="pendientes-title">
            <h2 id="pendientes-title" className="mb-3 text-sm font-semibold text-muted">
              Pendientes ({pendientes.length})
            </h2>
            {pendientes.length ? renderList(pendientes) : <p className="text-sm text-muted">No hay tareas pendientes.</p>}
          </section>
          {completadas.length > 0 && (
            <section aria-labelledby="completadas-title">
              <h2 id="completadas-title" className="mb-3 text-sm font-semibold text-muted">
                Completadas ({completadas.length})
              </h2>
              {renderList(completadas)}
            </section>
          )}
        </div>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Nueva tarea">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <Field label="Título *" htmlFor="t-titulo">
            <Input id="t-titulo" required value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </Field>
          <Field label="Descripción" htmlFor="t-desc">
            <Textarea id="t-desc" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fecha límite" htmlFor="t-fecha">
              <Input id="t-fecha" type="date" value={fechaLimite} onChange={(e) => setFechaLimite(e.target.value)} />
            </Field>
            <Field label="Pedido" htmlFor="t-pedido">
              <Select id="t-pedido" value={pedidoId} onChange={(e) => setPedidoId(e.target.value)}>
                <option value="">Sin pedido</option>
                {pedidos?.map((p) => (
                  <option key={p.id} value={p.id}>
                    Pedido #{p.id} · {p.estado}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          {formError && <ErrorBanner message={formError} />}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              Crear
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        title="Eliminar tarea"
        message="¿Seguro que querés eliminar esta tarea?"
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
        loading={deleting}
      />
    </div>
  );
}
