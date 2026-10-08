import type { ReactNode } from "react";
import useSWR from "swr";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, CalendarClock, ClipboardList, SquareCheck } from "lucide-react";
import { fetcher, getErrorMessage } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { Badge, Card, ErrorBanner, LoadingState, PageHeader } from "@/components/ui";
import { cn, formatDate, formatMoney, toNumber } from "@/lib/format";
import type { Insumo, Pedido, Tarea } from "@/types";
import { ESTADOS_PEDIDO } from "./pedidos/estados";

const TAREA_DONE = "COMPLETADA";
const ESTADOS_ACTIVOS = ESTADOS_PEDIDO.filter((e) => e.value !== "ENTREGADO" && e.value !== "CANCELADO");

function SeeAll({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-muted transition-colors hover:bg-ink/5 hover:text-ink"
    >
      {label}
      <ArrowRight className="size-3.5" aria-hidden="true" />
    </Link>
  );
}

function CardBody({ loading, error, onRetry, children }: { loading: boolean; error: unknown; onRetry: () => void; children: ReactNode }) {
  if (loading) return <LoadingState />;
  if (error) return <ErrorBanner message={getErrorMessage(error)} onRetry={onRetry} />;
  return <>{children}</>;
}

function PedidosCard() {
  const { data, error, isLoading, mutate } = useSWR<Pedido[]>("/pedidos", fetcher);
  const pedidos = data ?? [];
  const activos = pedidos.filter((p) => p.estado !== "ENTREGADO" && p.estado !== "CANCELADO");
  const saldo = pedidos.filter((p) => p.estado !== "CANCELADO").reduce((s, p) => s + toNumber(p.restaPagar), 0);

  return (
    <Card title="Pedidos" icon={<ClipboardList className="size-4 text-muted" aria-hidden="true" />} action={<SeeAll to="/pedidos" label="Ver pedidos" />}>
      <CardBody loading={isLoading} error={error} onRetry={() => mutate()}>
        <p className="text-sm text-muted">Pedidos activos</p>
        <p className="mt-1 text-5xl font-extrabold tabular-nums">{activos.length}</p>
        <p className="mt-2 text-sm text-muted">
          Saldo por cobrar <span className="font-semibold text-ink tabular-nums">{formatMoney(saldo)}</span>
        </p>

        {activos.length > 0 && (
          <ul className="mt-5 flex flex-col gap-3 border-t border-line pt-4">
            {ESTADOS_ACTIVOS.map((e) => {
              const count = activos.filter((p) => p.estado === e.value).length;
              return (
                <li key={e.value}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium">{e.label}</span>
                    <span className="font-semibold tabular-nums">{count}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-ink/10" role="presentation">
                    <div className="h-full rounded-full bg-ink" style={{ width: `${(count / activos.length) * 100}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

function InsumosCriticosCard() {
  const { data, error, isLoading, mutate } = useSWR<Insumo[]>("/insumos/stock-bajo", fetcher);
  const insumos = Array.isArray(data) ? data : [];

  return (
    <Card
      title="Insumos Críticos"
      icon={<AlertTriangle className="size-4 text-danger" aria-hidden="true" />}
      action={<SeeAll to="/insumos" label="Ver insumos" />}
    >
      <CardBody loading={isLoading} error={error} onRetry={() => mutate()}>
        {insumos.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Todo el stock está por encima del mínimo.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {insumos.map((i) => {
              const stock = toNumber(i.stockActual);
              const minimo = toNumber(i.stockMinimo);
              const ratio = minimo > 0 ? Math.min(Math.max(stock / minimo, 0), 1) : 0;
              const critical = ratio <= 0.5;
              return (
                <li key={i.id}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-sm font-semibold">{i.nombre}</span>
                    <span className="shrink-0 text-xs text-muted tabular-nums">
                      {stock} / {minimo} {i.unidad}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-ink/10" role="presentation">
                    <div
                      className={cn("h-full rounded-full", critical ? "bg-danger" : "bg-warning")}
                      style={{ width: `${Math.max(ratio * 100, 4)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

function TareasCard() {
  const { data, error, isLoading, mutate } = useSWR<Tarea[]>("/tareas", fetcher);
  const pendientes = (data ?? []).filter((t) => t.estado !== TAREA_DONE);

  if (!isLoading && !error && pendientes.length === 0) return null;

  const proximas = [...pendientes]
    .sort((a, b) => {
      if (a.fechaLimite && b.fechaLimite) return new Date(a.fechaLimite).getTime() - new Date(b.fechaLimite).getTime();
      if (a.fechaLimite) return -1;
      if (b.fechaLimite) return 1;
      return 0;
    })
    .slice(0, 5);
  const today = new Date(new Date().toISOString().slice(0, 10));

  return (
    <Card
      title="Tareas por vencer"
      icon={<SquareCheck className="size-4 text-muted" aria-hidden="true" />}
      action={<SeeAll to="/tareas" label="Ver tareas" />}
    >
      <CardBody loading={isLoading} error={error} onRetry={() => mutate()}>
        <ul className="flex flex-col divide-y divide-line">
          {proximas.map((t) => {
            const overdue = t.fechaLimite ? new Date(t.fechaLimite) < today : false;
            return (
              <li key={t.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{t.titulo}</p>
                  {t.pedidoId && <p className="mt-0.5 text-xs text-muted">Pedido #{t.pedidoId}</p>}
                </div>
                {t.fechaLimite ? (
                  <Badge tone={overdue ? "danger" : "neutral"}>
                    <CalendarClock className="mr-1 size-3" aria-hidden="true" />
                    {formatDate(t.fechaLimite)}
                  </Badge>
                ) : (
                  <Badge>Sin fecha</Badge>
                )}
              </li>
            );
          })}
        </ul>
        {pendientes.length > proximas.length && (
          <p className="mt-3 text-xs text-muted">y {pendientes.length - proximas.length} más pendientes</p>
        )}
      </CardBody>
    </Card>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  return (
    <div>
      <PageHeader title="Dashboard" description={user?.nombre ? `Hola, ${user.nombre}. Este es el estado del taller.` : "Este es el estado del taller."} />
      <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
        <PedidosCard />
        <InsumosCriticosCard />
        <TareasCard />
      </div>
    </div>
  );
}
