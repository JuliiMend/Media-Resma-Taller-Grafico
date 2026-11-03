import { useMemo, useState, type ReactNode } from "react";
import useSWR from "swr";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  CalendarClock,
  ClipboardList,
  Copy,
  PackageSearch,
  Plus,
  Send,
  Wallet,
} from "lucide-react";
import { api, fetcher, getErrorMessage } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { Badge, Button, Card, ErrorBanner, Modal } from "@/components/ui";
import { nombreCliente } from "@/lib/clientes";
import { tieneDeuda } from "@/lib/deudas";
import {
  cn,
  formatCantidad,
  formatDate,
  formatMoneyShort,
  toDateInput,
  toNumber,
} from "@/lib/format";
import { formatVariacion, hoyBA, sumarDias } from "@/lib/reportes";
import { useRegistrarHistorial } from "@/lib/useHistorial";
import type { Insumo, Pedido, ResumenReporte, Tarea } from "@/types";
import { ESTADOS_PEDIDO } from "./pedidos/estados";

const TAREA_DONE = "COMPLETADA";
const ESTADOS_ACTIVOS = ["PENDIENTE", "EN_PROCESO", "LISTO"];
const ESTADOS_BARRAS = ESTADOS_PEDIDO.filter((e) => ESTADOS_ACTIVOS.includes(e.value));
const esActivo = (p: Pedido) => ESTADOS_ACTIVOS.includes(p.estado);
const MS_DIA = 86_400_000;

const SWR_DASHBOARD = {
  keepPreviousData: true,
  revalidateOnFocus: true,
  focusThrottleInterval: 60_000,
} as const;

type ResultadoCanal = {
  canal: "telegram" | "email";
  ok: boolean;
  configurado: boolean;
  error?: string;
};

type CanalesResultado = {
  telegram: ResultadoCanal;
  email: ResultadoCanal;
};

type ResultadoAlertas = {
  avisos: number;
  canales?: CanalesResultado;
};

function marcaCanal(canal: ResultadoCanal | undefined): string {
  if (!canal) return "✗ (sin datos)";
  if (canal.ok) return "✓";
  if (!canal.configurado) return "✗ (No configurado)";
  return `✗${canal.error ? ` (${canal.error})` : ""}`;
}

function resumenCanales(canales: CanalesResultado | undefined): string {
  return `Telegram ${marcaCanal(canales?.telegram)} · Email ${marcaCanal(canales?.email)}`;
}

function fallaronTodosLosCanales(canales: CanalesResultado | undefined): boolean {
  if (!canales) return false;
  return !canales.telegram.ok && !canales.email.ok;
}

const COLORES_ESTADO: Record<string, string> = {
  PENDIENTE: "bg-ink/25",
  EN_PROCESO: "bg-ink/45",
  LISTO: "bg-ink/70",
};

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-ink/10 motion-reduce:animate-none", className)}
      aria-hidden="true"
    />
  );
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

function CardBody({
  loading,
  error,
  onRetry,
  skeletonRows,
  children,
}: {
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
      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-muted transition-colors hover:bg-ink/5 hover:text-ink motion-reduce:transition-none"
    >
      {label}
      <ArrowRight className="size-3.5" aria-hidden="true" />
    </Link>
  );
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function fechaHoyLarga(): string {
  const partes = new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).formatToParts(new Date());
  const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((parte) => parte.type === tipo)?.value ?? "";
  return `${valor("weekday")} ${valor("day")} de ${valor("month")}`;
}

function etiquetaDia(fecha: string, hoy: string): string {
  if (fecha === hoy) return "Hoy";
  if (fecha === sumarDias(hoy, 1)) return "Mañana";
  const dia = new Date(`${fecha}T12:00:00.000Z`);
  return capitalizar(
    dia.toLocaleDateString("es-AR", {
      weekday: "long",
      day: "numeric",
      timeZone: "UTC",
    }),
  );
}

function diasDesde(fecha: string, hoy: string): number {
  const objetivo = Date.parse(`${fecha}T00:00:00.000Z`);
  const base = Date.parse(`${hoy}T00:00:00.000Z`);
  if (!Number.isFinite(objetivo) || !Number.isFinite(base)) return 0;
  return Math.max(0, Math.round((base - objetivo) / MS_DIA));
}

interface FilaAgenda {
  key: string;
  label: string;
  pedidos: Pedido[];
  danger?: boolean;
}

function construirAgenda(pedidos: Pedido[], hoy: string): FilaAgenda[] {
  const porFecha = new Map<string, Pedido[]>();

  for (const pedido of pedidos) {
    if (!esActivo(pedido) || !pedido.fechaEntrega) continue;
    const fecha = toDateInput(pedido.fechaEntrega);
    if (!fecha) continue;
    const lista = porFecha.get(fecha) ?? [];
    lista.push(pedido);
    porFecha.set(fecha, lista);
  }
  for (const lista of porFecha.values()) lista.sort((a, b) => a.id - b.id);

  const filas: FilaAgenda[] = [];
  const atrasados: Pedido[] = [];

  for (const [fecha, lista] of porFecha) {
    if (fecha < hoy) atrasados.push(...lista);
  }
  atrasados.sort(
    (a, b) =>
      toDateInput(a.fechaEntrega).localeCompare(toDateInput(b.fechaEntrega)) || a.id - b.id,
  );
  if (atrasados.length > 0) {
    filas.push({ key: "atrasados", label: "Atrasados", pedidos: atrasados, danger: true });
  }

  let vacios: string[] = [];
  const volcarVacios = () => {
    if (vacios.length === 0) return;
    if (vacios.length > 3) {
      filas.push({
        key: `vacio-${vacios[0]}`,
        label: `${etiquetaDia(vacios[0], hoy)} – ${etiquetaDia(vacios[vacios.length - 1], hoy)}`,
        pedidos: [],
      });
    } else {
      for (const fecha of vacios) {
        filas.push({ key: fecha, label: etiquetaDia(fecha, hoy), pedidos: [] });
      }
    }
    vacios = [];
  };

  for (let i = 0; i < 7; i += 1) {
    const fecha = sumarDias(hoy, i);
    const lista = porFecha.get(fecha) ?? [];
    if (lista.length === 0) {
      vacios.push(fecha);
    } else {
      volcarVacios();
      filas.push({ key: fecha, label: etiquetaDia(fecha, hoy), pedidos: lista });
    }
  }
  volcarVacios();

  return filas;
}

interface Deudor {
  clienteId: number;
  nombre: string;
  total: number;
  pedidos: number[];
  dias: number;
}

function construirDeudores(pedidos: Pedido[], hoy: string): Deudor[] {
  const mapa = new Map<number, Deudor>();

  for (const pedido of pedidos) {
    if (pedido.estado !== "LISTO" && pedido.estado !== "ENTREGADO") continue;
    if (!tieneDeuda(pedido)) continue;

    const actual = mapa.get(pedido.clienteId) ?? {
      clienteId: pedido.clienteId,
      nombre: nombreCliente(pedido),
      total: 0,
      pedidos: [],
      dias: 0,
    };

    actual.total += toNumber(pedido.restaPagar);
    actual.pedidos.push(pedido.id);
    const fecha = toDateInput(pedido.fecha);
    if (fecha) actual.dias = Math.max(actual.dias, diasDesde(fecha, hoy));
    mapa.set(pedido.clienteId, actual);
  }

  return [...mapa.values()]
    .map((deudor) => ({ ...deudor, pedidos: [...deudor.pedidos].sort((a, b) => a - b) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);
}

function mensajeAviso(deudor: Deudor): string {
  const ids = deudor.pedidos.map((id) => `#${id}`).join(", ");
  return `Hola ${deudor.nombre}! Te escribo por el saldo pendiente de ${formatMoneyShort(deudor.total)} (pedido(s) ${ids}). ¡Gracias!`;
}

async function copiarAlPortapapeles(texto: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch {
    // sigue con el fallback
  }

  try {
    const area = document.createElement("textarea");
    area.value = texto;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "-9999px";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

function KpiCard({
  label,
  value,
  hint,
  to,
  danger,
  loading,
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  to: string;
  danger?: boolean;
  loading?: boolean;
  icon: ReactNode;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "flex min-w-0 flex-col rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-ink/20 hover:bg-raised motion-reduce:transition-none",
        danger && "border-l-2 border-l-danger",
      )}
    >
      <p className="flex items-center gap-2 text-sm text-muted">
        {icon}
        {label}
      </p>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-32" />
      ) : (
        <p
          className={cn(
            "mt-2 min-w-0 truncate text-2xl font-bold tabular-nums 2xl:text-3xl",
            danger && "text-danger",
          )}
        >
          {value}
        </p>
      )}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Link>
  );
}

type PeriodoVentas = "hoy" | "semana" | "mes";

function rangoVentas(periodo: PeriodoVentas, hoy: string): { desde: string; hasta: string } {
  if (periodo === "hoy") return { desde: hoy, hasta: hoy };
  if (periodo === "semana") return { desde: sumarDias(hoy, -6), hasta: hoy };

  const mes = hoy.slice(0, 7);
  const [anio, mesNumero] = mes.split("-").map(Number);
  const ultimo = new Date(Date.UTC(anio, mesNumero, 0)).getUTCDate();
  return {
    desde: `${mes}-01`,
    hasta: `${mes}-${String(ultimo).padStart(2, "0")}`,
  };
}

function VentasCard() {
  const [periodo, setPeriodo] = useState<PeriodoVentas>("mes");
  const hoy = hoyBA();
  const rango = useMemo(() => rangoVentas(periodo, hoy), [periodo, hoy]);
  const key = `/reportes/resumen?desde=${rango.desde}&hasta=${rango.hasta}&comparar=1`;
  const { data, error, isLoading, mutate } = useSWR<ResumenReporte>(
    key,
    fetcher,
    SWR_DASHBOARD,
  );

  const ingresos = data?.actual.ingresos;
  const variacion = data?.variacion?.ingresos ?? null;

  return (
    <div className="flex min-w-0 flex-col rounded-2xl border border-line bg-surface p-5">
      <Link
        to="/reportes"
        className="min-w-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <p className="flex items-center gap-2 text-sm text-muted">
          <Wallet className="size-4 text-muted" aria-hidden="true" />
          Ventas
        </p>
        {isLoading && !data ? (
          <Skeleton className="mt-3 h-8 w-32" />
        ) : (
          <p className="mt-2 min-w-0 truncate text-2xl font-bold tabular-nums 2xl:text-3xl">
            {formatMoneyShort(ingresos)}
          </p>
        )}
        {variacion !== null ? (
          <p className="mt-1 flex flex-wrap items-center gap-x-1 text-xs">
            <span
              className={cn(
                "font-semibold",
                variacion >= 0 ? "text-success" : "text-danger",
              )}
            >
              {variacion >= 0 ? "▲" : "▼"} {formatVariacion(variacion)}
            </span>
            <span className="text-muted">vs. período anterior</span>
          </p>
        ) : (
          <p className="mt-1 text-xs text-muted">
            {error ? "No se pudieron cargar las ventas" : "Sin comparación"}
          </p>
        )}
      </Link>

      {error && (
        <button
          type="button"
          onClick={() => void mutate()}
          className="mt-1 self-start text-xs font-semibold text-danger underline underline-offset-2"
        >
          Reintentar
        </button>
      )}

      <div
        className="mt-3 inline-flex self-start rounded-lg border border-line bg-background p-0.5"
        role="group"
        aria-label="Período de ventas"
      >
        {(["hoy", "semana", "mes"] as const).map((opcion) => (
          <button
            key={opcion}
            type="button"
            onClick={() => setPeriodo(opcion)}
            aria-pressed={periodo === opcion}
            className={cn(
              "rounded-md px-2 py-1 text-xs font-semibold transition-colors motion-reduce:transition-none",
              periodo === opcion
                ? "bg-ink text-background"
                : "text-muted hover:text-ink",
            )}
          >
            {opcion === "hoy" ? "Hoy" : opcion === "semana" ? "Semana" : "Mes"}
          </button>
        ))}
      </div>
    </div>
  );
}

function AgendaCard({
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
  const hoy = hoyBA();
  const filas = useMemo(() => construirAgenda(pedidos, hoy), [pedidos, hoy]);
  const hayEntregas = pedidos.some((p) => esActivo(p) && p.fechaEntrega);

  return (
    <Card
      title="Esta semana"
      icon={<CalendarClock className="size-4 text-muted" aria-hidden="true" />}
    >
      <CardBody loading={loading} error={error} onRetry={onRetry} skeletonRows={5}>
        {!hayEntregas ? (
          <p className="py-6 text-center text-sm text-muted">Sin entregas esta semana.</p>
        ) : (
          <ul className="flex flex-col">
            {filas.map((fila) => (
              <li
                key={fila.key}
                className="grid grid-cols-[6.5rem_1fr] items-start gap-3 border-b border-line py-2.5 last:border-0 md:grid-cols-[10rem_1fr]"
              >
                <span
                  className={cn(
                    "text-sm font-medium",
                    fila.danger ? "text-danger" : "text-muted",
                  )}
                >
                  {fila.label}
                </span>
                {fila.pedidos.length === 0 ? (
                  <span className="text-sm text-muted">—</span>
                ) : (
                  <span className="flex min-w-0 flex-wrap gap-1.5">
                    {fila.pedidos.map((pedido) => (
                      <Link
                        key={pedido.id}
                        to={`/pedidos?pedido=${pedido.id}`}
                        title={`#${pedido.id} ${nombreCliente(pedido)}`}
                        className="inline-flex max-w-full items-center gap-1 rounded-full border border-line bg-background px-2.5 py-1 text-xs font-medium transition-colors hover:border-ink/25 hover:bg-raised motion-reduce:transition-none"
                      >
                        <span className="text-muted">#{pedido.id}</span>
                        <span className="min-w-0 max-w-[10rem] truncate">
                          {nombreCliente(pedido)}
                        </span>
                      </Link>
                    ))}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

function ParaCobrarCard({
  deudores,
  loading,
  error,
  onRetry,
}: {
  deudores: Deudor[];
  loading: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  const [copiadoId, setCopiadoId] = useState<number | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  async function copiar(deudor: Deudor) {
    setCopyError(null);
    const ok = await copiarAlPortapapeles(mensajeAviso(deudor));
    if (!ok) {
      setCopyError("No se pudo copiar el aviso.");
      return;
    }
    setCopiadoId(deudor.clienteId);
    window.setTimeout(() => {
      setCopiadoId((actual) => (actual === deudor.clienteId ? null : actual));
    }, 2000);
  }

  return (
    <Card
      title="Para cobrar"
      icon={<Wallet className="size-4 text-muted" aria-hidden="true" />}
    >
      <CardBody loading={loading} error={error} onRetry={onRetry} skeletonRows={3}>
        {deudores.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Sin deudas pendientes.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {deudores.map((deudor) => (
              <li
                key={deudor.clienteId}
                className="flex items-start gap-2 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{deudor.nombre}</p>
                  <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs text-muted">
                    <span className="font-semibold text-ink tabular-nums">
                      {formatMoneyShort(deudor.total)}
                    </span>
                    <span
                      className={cn(
                        "tabular-nums",
                        deudor.dias > 30 && "font-semibold text-danger",
                      )}
                    >
                      {deudor.dias === 0
                        ? "hoy"
                        : `${deudor.dias} ${deudor.dias === 1 ? "día" : "días"}`}
                    </span>
                    {copiadoId === deudor.clienteId && (
                      <span className="font-semibold text-success">Copiado</span>
                    )}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => void copiar(deudor)}
                  aria-label={`Copiar aviso para ${deudor.nombre}`}
                  title="Copiar aviso"
                >
                  <Copy className="size-4" aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        {copyError && <p className="mt-2 text-xs text-danger">{copyError}</p>}
        <div className="mt-4">
          <SeeAll to="/pedidos?vista=deudas" label="Ver todas" />
        </div>
      </CardBody>
    </Card>
  );
}

function PedidosPorEstadoCard({
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
  const conteos = ESTADOS_BARRAS.map((estado) => ({
    ...estado,
    count: activos.filter((pedido) => pedido.estado === estado.value).length,
  }));

  return (
    <Card
      title="Pedidos por estado"
      icon={<ClipboardList className="size-4 text-muted" aria-hidden="true" />}
    >
      <CardBody loading={loading} error={error} onRetry={onRetry} skeletonRows={3}>
        {activos.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Sin pedidos activos.</p>
        ) : (
          <>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-ink/10">
              {conteos
                .filter((estado) => estado.count > 0)
                .map((estado) => (
                  <Link
                    key={estado.value}
                    to={`/pedidos?estados=${estado.value}`}
                    aria-label={`${estado.label}: ${estado.count}`}
                    title={`${estado.label}: ${estado.count}`}
                    className={cn(
                      "h-full transition-opacity hover:opacity-80 motion-reduce:transition-none",
                      COLORES_ESTADO[estado.value] ?? "bg-ink/50",
                    )}
                    style={{ flexGrow: estado.count, flexBasis: 0 }}
                  />
                ))}
            </div>

            <ul className="mt-4 flex flex-col gap-1">
              {conteos.map((estado) => (
                <li key={estado.value}>
                  <Link
                    to={`/pedidos?estados=${estado.value}`}
                    className="flex items-center justify-between gap-3 rounded-lg px-1 py-1.5 text-sm transition-colors hover:bg-ink/5 motion-reduce:transition-none"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "size-2 rounded-full",
                          COLORES_ESTADO[estado.value] ?? "bg-ink/50",
                        )}
                      />
                      {estado.label}
                    </span>
                    <span className="font-semibold tabular-nums">{estado.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardBody>
    </Card>
  );
}

function StockCard({
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
      title="Stock"
      icon={<PackageSearch className="size-4 text-muted" aria-hidden="true" />}
    >
      <CardBody loading={loading} error={error} onRetry={onRetry} skeletonRows={4}>
        {insumos.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Todo el stock está bien.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {visibles.map((insumo) => {
              const stock = toNumber(insumo.stockActual);
              const minimo = toNumber(insumo.stockMinimo);
              const ratio = minimo > 0 ? stock / minimo : stock > 0 ? 1 : 0;
              const rojo = stock <= 0 || ratio <= 0.5;
              const nivel = stock <= 0 ? 3 : Math.max(0, Math.min(3, Math.ceil(ratio * 3)));
              const color = rojo ? "bg-danger" : "bg-warning";

              return (
                <li
                  key={insumo.id}
                  className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                  title={`${formatCantidad(stock)} / ${formatCantidad(minimo)} ${insumo.unidad}`}
                >
                  <span className="min-w-0 truncate text-sm font-semibold">
                    {insumo.nombre}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="flex items-center gap-0.5" aria-hidden="true">
                      {[0, 1, 2].map((punto) => (
                        <span
                          key={punto}
                          className={cn(
                            "size-1.5 rounded-full",
                            punto < nivel ? color : "bg-ink/15",
                          )}
                        />
                      ))}
                    </span>
                    <span
                      className={cn(
                        "text-xs font-semibold",
                        rojo ? "text-danger" : "text-warning",
                      )}
                    >
                      {stock <= 0 ? "Agotado" : "Bajo"}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {insumos.length > visibles.length && (
          <p className="mt-2 text-xs text-muted">
            y {insumos.length - visibles.length} más con stock bajo
          </p>
        )}
        <div className="mt-4">
          <SeeAll to="/insumos" label="Ver insumos" />
        </div>
      </CardBody>
    </Card>
  );
}

function TareasCard({
  tareas,
  loading,
  error,
  onRetry,
  onCompletar,
  completando,
  actionError,
}: {
  tareas: Tarea[];
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  onCompletar: (tarea: Tarea) => void;
  completando: Set<number>;
  actionError: string | null;
}) {
  const hoy = hoyBA();
  const pendientes = [...tareas.filter((tarea) => tarea.estado !== TAREA_DONE)]
    .sort((a, b) => {
      if (a.fechaLimite && b.fechaLimite) {
        return (
          new Date(a.fechaLimite).getTime() - new Date(b.fechaLimite).getTime() ||
          a.id - b.id
        );
      }
      if (a.fechaLimite) return -1;
      if (b.fechaLimite) return 1;
      return a.id - b.id;
    })
    .slice(0, 5);

  return (
    <Card
      title="Tareas"
      icon={<ClipboardList className="size-4 text-muted" aria-hidden="true" />}
    >
      <CardBody loading={loading} error={error} onRetry={onRetry} skeletonRows={4}>
        {actionError && <p className="mb-2 text-xs text-danger">{actionError}</p>}
        {pendientes.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No hay tareas pendientes.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {pendientes.map((tarea) => {
              const fecha = tarea.fechaLimite ? toDateInput(tarea.fechaLimite) : "";
              const vencida = Boolean(fecha && fecha < hoy);

              return (
                <li
                  key={tarea.id}
                  className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <input
                    type="checkbox"
                    className="mt-1 size-4 shrink-0 accent-primary"
                    checked={false}
                    disabled={completando.has(tarea.id)}
                    onChange={() => onCompletar(tarea)}
                    aria-label={`Marcar "${tarea.titulo}" como completada`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{tarea.titulo}</p>
                    {tarea.fechaLimite && (
                      <div className="mt-1">
                        <Badge tone={vencida ? "danger" : "neutral"}>
                          <CalendarClock className="mr-1 size-3" aria-hidden="true" />
                          {formatDate(tarea.fechaLimite)}
                        </Badge>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-4">
          <SeeAll to="/tareas" label="Ver tareas" />
        </div>
      </CardBody>
    </Card>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const registrar = useRegistrarHistorial();
  const hoy = hoyBA();

  const {
    data: pedidosData,
    error: pedidosError,
    isLoading: pedidosLoading,
    mutate: mutatePedidos,
  } = useSWR<Pedido[]>("/pedidos", fetcher, SWR_DASHBOARD);
  const {
    data: insumosData,
    error: insumosError,
    isLoading: insumosLoading,
    mutate: mutateInsumos,
  } = useSWR<Insumo[]>("/insumos/stock-bajo", fetcher, SWR_DASHBOARD);
  const {
    data: tareasData,
    error: tareasError,
    isLoading: tareasLoading,
    mutate: mutateTareas,
  } = useSWR<Tarea[]>("/tareas", fetcher, SWR_DASHBOARD);

  const [checking, setChecking] = useState(false);
  const [testing, setTesting] = useState(false);
  const [alertNotice, setAlertNotice] = useState<string | null>(null);
  const [alertError, setAlertError] = useState<string | null>(null);
  const [tareaError, setTareaError] = useState<string | null>(null);
  const [completando, setCompletando] = useState<Set<number>>(new Set());
  const [paso, setPaso] = useState<null | "cartel" | "foto">(null);

  const pedidos = Array.isArray(pedidosData) ? pedidosData : [];
  const insumos = Array.isArray(insumosData) ? insumosData : [];
  const tareas = Array.isArray(tareasData) ? tareasData : [];

  const activos = pedidos.filter(esActivo);
  const saldo = pedidos.filter(tieneDeuda).reduce((s, p) => s + toNumber(p.restaPagar), 0);
  const deudas = pedidos.filter(
    (p) => (p.estado === "LISTO" || p.estado === "ENTREGADO") && tieneDeuda(p),
  );
  const saldoDeudas = deudas.reduce((s, p) => s + toNumber(p.restaPagar), 0);

  const deudores = useMemo(() => construirDeudores(pedidos, hoy), [pedidos, hoy]);

  const pedidosAtrasados = pedidos.filter(
    (p) => esActivo(p) && p.fechaEntrega && toDateInput(p.fechaEntrega) < hoy,
  );
  const insumosAgotados = insumos.filter((i) => toNumber(i.stockActual) <= 0);

  const urgencias: string[] = [];
  if (pedidosAtrasados.length > 0) {
    urgencias.push(
      `${pedidosAtrasados.length} ${
        pedidosAtrasados.length === 1 ? "pedido atrasado" : "pedidos atrasados"
      }`,
    );
  }
  if (insumosAgotados.length > 0) {
    urgencias.push(
      `${insumosAgotados.length} ${
        insumosAgotados.length === 1 ? "insumo agotado" : "insumos agotados"
      }`,
    );
  }
  const urgenteHref =
    pedidosAtrasados.length > 0
      ? "/pedidos?estados=PENDIENTE,EN_PROCESO,LISTO&orden=entrega&dir=asc"
      : "/insumos";

  async function checkAlerts() {
    setChecking(true);
    setAlertNotice(null);
    setAlertError(null);
    try {
      const { data } = await api.post<ResultadoAlertas>("/alertas/chequear");
      if ((data.avisos ?? 0) === 0) {
        setAlertNotice("Sin avisos pendientes");
        return;
      }

      const resumen = resumenCanales(data.canales);
      if (fallaronTodosLosCanales(data.canales)) {
        setAlertError(`No se pudieron enviar los avisos: ${resumen}`);
        return;
      }

      const cantidad = `${data.avisos} ${data.avisos === 1 ? "aviso" : "avisos"}`;
      setAlertNotice(`${cantidad} · ${resumen}`);
    } catch (err) {
      setAlertError(getErrorMessage(err));
    } finally {
      setChecking(false);
    }
  }

  async function probarNotificaciones() {
    setTesting(true);
    setAlertNotice(null);
    setAlertError(null);
    try {
      const { data } = await api.post<{ canales: CanalesResultado }>("/alertas/probar");
      const resumen = resumenCanales(data.canales);
      if (fallaronTodosLosCanales(data.canales)) {
        setAlertError(`No se pudo enviar la prueba: ${resumen}`);
        return;
      }
      setAlertNotice(`Prueba enviada · ${resumen}`);
    } catch (err) {
      setAlertError(getErrorMessage(err));
    } finally {
      setTesting(false);
    }
  }

  function cerrarCartel() {
    setPaso(null);
    // Abre la foto recién cuando el cartel terminó de cerrarse.
    window.setTimeout(() => setPaso("foto"), 0);
  }

  async function completarTarea(tarea: Tarea) {
    setTareaError(null);
    setCompletando((actual) => new Set(actual).add(tarea.id));

    try {
      await mutateTareas(
        async (actual) => {
          await api.patch(`/tareas/${tarea.id}`, { estado: TAREA_DONE });
          return actual?.map((t) => (t.id === tarea.id ? { ...t, estado: TAREA_DONE } : t));
        },
        {
          optimisticData: (actual) =>
            (actual ?? []).map((t) =>
              t.id === tarea.id ? { ...t, estado: TAREA_DONE } : t,
            ),
          rollbackOnError: true,
          revalidate: false,
        },
      );
      void registrar(
        "COMPLETAR",
        "tarea",
        tarea.id,
        `Completó la tarea "${tarea.titulo}"`,
      );
    } catch (err) {
      setTareaError(getErrorMessage(err));
    } finally {
      setCompletando((actual) => {
        const next = new Set(actual);
        next.delete(tarea.id);
        return next;
      });
    }
  }

  return (
    <div className="w-full">
      <header className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted">{fechaHoyLarga()}</p>
          <h1 className="mt-1 truncate text-2xl font-bold tracking-tight md:text-3xl">
            Hola{user?.nombre ? `, ${user.nombre}` : ""}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate("/pedidos?nuevo=1")}
          >
            <Plus className="size-4" aria-hidden="true" />
            Pedido
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate("/compras?nuevo=1")}
          >
            <Plus className="size-4" aria-hidden="true" />
            Compra
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate("/presupuestos")}
          >
            <Plus className="size-4" aria-hidden="true" />
            Presupuesto
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={checkAlerts}
            loading={checking}
            aria-label="Revisar alertas"
            title="Revisar alertas"
          >
            {!checking && <BellRing className="size-4" aria-hidden="true" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={probarNotificaciones}
            loading={testing}
            aria-label="Enviar prueba de notificaciones"
            title="Enviar prueba"
          >
            {!testing && <Send className="size-4" aria-hidden="true" />}
          </Button>
          <Button variant="danger" size="sm" onClick={() => setPaso("cartel")}>
            No toques este botón
          </Button>
        </div>
      </header>

      {alertNotice && (
        <div
          role="status"
          className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-success/20 bg-success-soft px-4 py-2.5 text-sm text-success"
        >
          <span>{alertNotice}</span>
          <button
            type="button"
            onClick={() => setAlertNotice(null)}
            className="text-xs font-semibold underline underline-offset-2"
          >
            Cerrar
          </button>
        </div>
      )}
      {alertError && (
        <div className="mb-4">
          <ErrorBanner message={alertError} />
        </div>
      )}

      {urgencias.length > 0 && (
        <Link
          to={urgenteHref}
          className="mb-4 flex items-center gap-2 rounded-xl border border-danger/30 bg-danger-soft px-4 py-2.5 text-sm font-medium text-danger transition-colors hover:border-danger/50 motion-reduce:transition-none"
        >
          <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1">{urgencias.join(" · ")}</span>
          <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
        </Link>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12 xl:gap-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:col-span-2 xl:col-span-12 xl:grid-cols-4">
          <KpiCard
            label="Pedidos activos"
            value={activos.length}
            to="/pedidos"
            loading={pedidosLoading}
            icon={<ClipboardList className="size-4 text-muted" aria-hidden="true" />}
          />
          <KpiCard
            label="Por cobrar"
            value={formatMoneyShort(saldo)}
            to="/pedidos?vista=deudas"
            loading={pedidosLoading}
            icon={<Wallet className="size-4 text-muted" aria-hidden="true" />}
          />
          <KpiCard
            label="Vencido sin cobrar"
            value={formatMoneyShort(saldoDeudas)}
            hint={`${deudas.length} ${deudas.length === 1 ? "pedido" : "pedidos"}`}
            to="/pedidos?vista=deudas"
            danger={saldoDeudas > 0}
            loading={pedidosLoading}
            icon={<AlertTriangle className="size-4 text-danger" aria-hidden="true" />}
          />
          <VentasCard />
        </div>

        <div className="md:col-span-2 xl:col-span-8">
          <AgendaCard
            pedidos={pedidos}
            loading={pedidosLoading}
            error={pedidosError}
            onRetry={() => mutatePedidos()}
          />
        </div>

        <div className="md:col-span-1 xl:col-span-4">
          <ParaCobrarCard
            deudores={deudores}
            loading={pedidosLoading}
            error={pedidosError}
            onRetry={() => mutatePedidos()}
          />
        </div>

        <div className="md:col-span-1 xl:col-span-4">
          <PedidosPorEstadoCard
            pedidos={pedidos}
            loading={pedidosLoading}
            error={pedidosError}
            onRetry={() => mutatePedidos()}
          />
        </div>

        <div className="md:col-span-1 xl:col-span-4">
          <StockCard
            insumos={insumos}
            loading={insumosLoading}
            error={insumosError}
            onRetry={() => mutateInsumos()}
          />
        </div>

        <div className="md:col-span-2 xl:col-span-4">
          <TareasCard
            tareas={tareas}
            loading={tareasLoading}
            error={tareasError}
            onRetry={() => mutateTareas()}
            onCompletar={completarTarea}
            completando={completando}
            actionError={tareaError}
          />
        </div>
      </div>

      <Modal
        open={paso === "cartel"}
        onClose={cerrarCartel}
        title="Sorpresa"
        footer={
          <div className="flex justify-end">
            <Button variant="secondary" onClick={cerrarCartel}>
              Cerrar
            </Button>
          </div>
        }
      >
        <p className="text-base">¡Te dije que no lo abras bro!</p>
      </Modal>

      <Modal
        open={paso === "foto"}
        onClose={() => setPaso(null)}
        title="Conito"
        size="lg"
        footer={
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => setPaso(null)}>
              Cerrar
            </Button>
          </div>
        }
      >
        <div className="flex justify-center">
          <img
            src="/conito.jpg"
            alt="Conito"
            loading="lazy"
            className="max-h-[80vh] max-w-full object-contain"
          />
        </div>
      </Modal>
    </div>
  );
}
