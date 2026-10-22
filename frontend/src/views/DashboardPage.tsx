import { useState, type ReactNode } from "react";
import useSWR from "swr";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, BellRing, CalendarClock, ClipboardList, PackageSearch, SquareCheck, Wallet } from "lucide-react";
import { api, fetcher, getErrorMessage } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { Badge, Button, Card, ErrorBanner, PageHeader } from "@/components/ui";
import { cn, formatDate, formatMoney, toDateInput, toNumber } from "@/lib/format";
import type { Insumo, Pedido, Tarea } from "@/types";
import { ESTADOS_PEDIDO } from "./pedidos/estados";

const TAREA_DONE = "COMPLETADA";
const ESTADOS_ACTIVOS = ["PENDIENTE", "EN_PROCESO", "LISTO"];
const ESTADOS_BARRAS = ESTADOS_PEDIDO.filter((e) => ESTADOS_ACTIVOS.includes(e.value));
const esActivo = (p: Pedido) => ESTADOS_ACTIVOS.includes(p.estado);

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-ink/10", className)} aria-hidden="true" />;
}

function CardSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" role="status" aria-label="Cargando">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-6 w-full" />
      ))}
    </div>
  );
}

function CardBody({ loading, error, onRetry, skeletonRows, children }: {
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  skeletonRows?: number;
  children: ReactNode;
}) {
  if (loading) return <CardSkeleton rows={skeletonRows} />;
  if (error) return <ErrorBanner message={getErrorMessage(error)} onRetry={onRetry} />;
  return <>{children}</>;
}

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

function KpiCard({
  label,
  value,
  to,
  danger,
  loading,
  hint,
  icon,
}: {
  label: string;
  value: string | number;
  to?: string;
  danger?: boolean;
  loading?: boolean;
  hint?: string;
  icon?: ReactNode;
}) {
  const content = (
    <>
      <p className="flex items-center gap-2 text-sm text-muted">
        {icon}
        {label}
      </p>
      {loading ? (
        <Skeleton className="mt-2 h-9 w-24" />
      ) : (
        <p className={cn("mt-1 text-4xl font-extrabold tabular-nums", danger && "text-danger")}>{value}</p>
      )}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </>
  );

  const base = "flex flex-col rounded-2xl border p-5 transition-colors";

  if (to) {
    return (
      <Link
        to={to}
        className={cn(base, "border-line bg-surface hover:border-line hover:bg-raised")}
      >
        {content}
        <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-muted">
          Ver detalle
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </span>
      </Link>
    );
  }

  return <div className={cn(base, "border-line bg-surface")}>{content}</div>;
}

function EstadoPedidosCard({
  pedidos,
  loading,
  error,
  onRetry,
}: {
  pedidos: Pedido[];
  loading: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  const activos = pedidos.filter(esActivo);
  const max = Math.max(...ESTADOS_BARRAS.map((e) => activos.filter((p) => p.estado === e.value).length), 1);

  return (
    <Card title="Estado de pedidos" icon={<ClipboardList className="size-4 text-muted" aria-hidden="true" />} action={<SeeAll to="/pedidos" label="Ver pedidos" />}>
      <CardBody loading={loading} error={error} onRetry={onRetry} skeletonRows={3}>
        {activos.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No hay pedidos activos.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {ESTADOS_BARRAS.map((e) => {
              const count = activos.filter((p) => p.estado === e.value).length;
              return (
                <li key={e.value}>
                  <Link
                    to={`/pedidos?estados=${e.value}`}
                    className="group block rounded-lg p-1 -m-1 transition-colors hover:bg-ink/5"
                  >
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-medium group-hover:text-ink">{e.label}</span>
                      <span className="font-semibold tabular-nums">{count}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-ink/10" role="presentation">
                      <div className="h-full rounded-full bg-ink" style={{ width: `${(count / max) * 100}%` }} />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

function diasHasta(fecha: string): number {
  const hoy = new Date();
  const base = Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate());
  const objetivo = Date.parse(`${fecha}T00:00:00.000Z`);
  return Math.round((objetivo - base) / 86400000);
}

function chipEntrega(dias: number): { label: string; tone: "danger" | "warning" | "neutral" } {
  if (dias < 0) return { label: "vencido", tone: "danger" };
  if (dias === 0) return { label: "hoy", tone: "danger" };
  if (dias === 1) return { label: "mañana", tone: "warning" };
  return { label: `en ${dias} días`, tone: "neutral" };
}

function ProximasEntregasCard({
  pedidos,
  loading,
  error,
  onRetry,
}: {
  pedidos: Pedido[];
  loading: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  const hoy = toDateInput(new Date().toISOString());
  const limite = new Date();
  limite.setUTCDate(limite.getUTCDate() + 7);
  const limiteIso = toDateInput(limite.toISOString());

  const proximas = pedidos
    .filter(esActivo)
    .filter((p) => {
      if (!p.fechaEntrega) return false;
      const d = toDateInput(p.fechaEntrega);
      return d >= hoy && d <= limiteIso;
    })
    .sort((a, b) => toDateInput(a.fechaEntrega).localeCompare(toDateInput(b.fechaEntrega)))
    .slice(0, 6);

  return (
    <Card title="Próximas entregas" icon={<CalendarClock className="size-4 text-muted" aria-hidden="true" />} action={<SeeAll to="/pedidos" label="Ver pedidos" />}>
      <CardBody loading={loading} error={error} onRetry={onRetry} skeletonRows={4}>
        {proximas.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Sin entregas próximas</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {proximas.map((p) => {
              const dias = diasHasta(toDateInput(p.fechaEntrega));
              const chip = chipEntrega(dias);
              return (
                <li key={p.id}>
                  <Link
                    to={`/pedidos?pedido=${p.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg py-3 -mx-1 px-1 transition-colors hover:bg-ink/5 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        <span className="text-muted">#{p.id}</span>{" "}
                        {p.cliente?.nombre ?? `Cliente #${p.clienteId}`}
                      </p>
                      <p className="mt-0.5 text-xs text-muted tabular-nums">Entrega {formatDate(p.fechaEntrega)}</p>
                    </div>
                    <Badge tone={chip.tone}>{chip.label}</Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

function InsumosCriticosCard({
  insumos,
  loading,
  error,
  onRetry,
}: {
  insumos: Insumo[];
  loading: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  const visibles = insumos.slice(0, 5);

  return (
    <Card
      title="Insumos críticos"
      icon={<AlertTriangle className="size-4 text-danger" aria-hidden="true" />}
      action={<SeeAll to="/insumos" label="Ver insumos" />}
    >
      <CardBody loading={loading} error={error} onRetry={onRetry} skeletonRows={4}>
        {insumos.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Todo el stock está por encima del mínimo.</p>
        ) : (
          <>
            <ul className="flex flex-col gap-4">
              {visibles.map((i) => {
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
            {insumos.length > visibles.length && (
              <p className="mt-3 text-xs text-muted">y {insumos.length - visibles.length} más con stock bajo</p>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
}

function TareasCard({
  tareas,
  loading,
  error,
  onRetry,
}: {
  tareas: Tarea[];
  loading: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  const pendientes = tareas.filter((t) => t.estado !== TAREA_DONE);
  if (!loading && !error && pendientes.length === 0) return null;

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
      title="Tareas pendientes"
      icon={<SquareCheck className="size-4 text-muted" aria-hidden="true" />}
      action={<SeeAll to="/tareas" label="Ver tareas" />}
    >
      <CardBody loading={loading} error={error} onRetry={onRetry} skeletonRows={4}>
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

  const { data: pedidosData, error: pedidosError, isLoading: pedidosLoading, mutate: mutatePedidos } =
    useSWR<Pedido[]>("/pedidos", fetcher);
  const { data: insumosData, error: insumosError, isLoading: insumosLoading, mutate: mutateInsumos } =
    useSWR<Insumo[]>("/insumos/stock-bajo", fetcher);
  const { data: tareasData, error: tareasError, isLoading: tareasLoading, mutate: mutateTareas } =
    useSWR<Tarea[]>("/tareas", fetcher);

  const pedidos = Array.isArray(pedidosData) ? pedidosData : [];
  const insumos = Array.isArray(insumosData) ? insumosData : [];
  const tareas = Array.isArray(tareasData) ? tareasData : [];

  const [checking, setChecking] = useState(false);
  const [alertNotice, setAlertNotice] = useState<string | null>(null);
  const [alertError, setAlertError] = useState<string | null>(null);

  const activos = pedidos.filter(esActivo);
  const saldo = pedidos.filter((p) => p.estado !== "CANCELADO").reduce((s, p) => s + toNumber(p.restaPagar), 0);
  const deudas = pedidos.filter(
    (p) => (p.estado === "LISTO" || p.estado === "ENTREGADO") && toNumber(p.restaPagar) > 0,
  );
  const saldoDeudas = deudas.reduce((s, p) => s + toNumber(p.restaPagar), 0);

  async function checkAlerts() {
    setChecking(true);
    setAlertNotice(null);
    setAlertError(null);
    try {
      const { data } = await api.post<{ cantidad?: number; avisosGenerados?: number; message?: string }>("/alertas/chequear");
      const count = data.cantidad ?? data.avisosGenerados;
      setAlertNotice(data.message ?? (typeof count === "number" ? (count ? `${count} avisos generados` : "Todo al día, sin avisos") : "Revisión de alertas completada."));
    } catch (err) {
      setAlertError(getErrorMessage(err));
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Dashboard"
        description={user?.nombre ? `Hola, ${user.nombre}. Este es el estado del taller.` : "Este es el estado del taller."}
        action={
          <Button variant="dark" onClick={checkAlerts} loading={checking}>
            <BellRing className="size-4" aria-hidden="true" />
            Revisar alertas ahora
          </Button>
        }
      />

      {alertNotice && (
        <div role="status" className="mb-4 rounded-xl border border-success/20 bg-success-soft px-4 py-3 text-sm text-success">
          {alertNotice}
        </div>
      )}
      {alertError && (
        <div className="mb-4">
          <ErrorBanner message={alertError} />
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-4">
        <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Pedidos activos"
            value={activos.length}
            to="/pedidos"
            loading={pedidosLoading}
            icon={<ClipboardList className="size-4 text-muted" aria-hidden="true" />}
          />
          <KpiCard
            label="Saldo por cobrar"
            value={formatMoney(saldo)}
            loading={pedidosLoading}
            icon={<Wallet className="size-4 text-muted" aria-hidden="true" />}
          />
          <KpiCard
            label="Listos/entregados sin cobrar"
            value={formatMoney(saldoDeudas)}
            hint={`${deudas.length} ${deudas.length === 1 ? "pedido" : "pedidos"}`}
            to="/pedidos?vista=deudas"
            danger
            loading={pedidosLoading}
            icon={<AlertTriangle className="size-4 text-danger" aria-hidden="true" />}
          />
          <KpiCard
            label="Insumos críticos"
            value={insumos.length}
            to="/insumos"
            loading={insumosLoading}
            icon={<PackageSearch className="size-4 text-muted" aria-hidden="true" />}
          />
        </div>

        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
          <EstadoPedidosCard pedidos={pedidos} loading={pedidosLoading} error={pedidosError} onRetry={() => mutatePedidos()} />
          <ProximasEntregasCard pedidos={pedidos} loading={pedidosLoading} error={pedidosError} onRetry={() => mutatePedidos()} />
        </div>

        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
          <InsumosCriticosCard insumos={insumos} loading={insumosLoading} error={insumosError} onRetry={() => mutateInsumos()} />
          <TareasCard tareas={tareas} loading={tareasLoading} error={tareasError} onRetry={() => mutateTareas()} />
        </div>
      </div>
    </div>
  );
}
