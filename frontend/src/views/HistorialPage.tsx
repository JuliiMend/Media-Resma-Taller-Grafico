import { useMemo, useState, type ReactNode } from "react";
import useSWR from "swr";
import { Link } from "react-router-dom";
import { RefreshCw, Search } from "lucide-react";
import { fetcher, getErrorMessage } from "@/api/client";
import { Badge, Button, EmptyState, ErrorBanner, Field, Input, LoadingState, PageHeader, Select } from "@/components/ui";
import { Pagination, clampPage, paginate } from "@/components/Pagination";
import { formatDateTime, toDateInput } from "@/lib/format";
import type { HistorialEntry, Usuario } from "@/types";

const PAGE_SIZE = 15;

const accionTone = (accion: string) => {
  if (accion === "CREAR" || accion === "COMPLETAR") return "success" as const;
  if (accion === "ELIMINAR") return "danger" as const;
  if (accion === "EDITAR" || accion === "CAMBIO_ESTADO") return "primary" as const;
  return "neutral" as const;
};

const label = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase().replace(/_/g, " ");

function Detalle({ value }: { value: string }): ReactNode {
  return (
    <>
      {value.split(/(Pedido\s+#\d+)/gi).map((parte, i) => {
        const match = /^Pedido\s+#(\d+)$/i.exec(parte);
        if (!match) return <span key={i}>{parte}</span>;
        return (
          <Link
            key={i}
            to={`/pedidos?pedido=${match[1]}`}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            {parte}
          </Link>
        );
      })}
    </>
  );
}

export function HistorialPage() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<HistorialEntry[]>("/historial", fetcher);
  const { data: usuarios } = useSWR<Usuario[]>("/usuarios", fetcher);
  const [query, setQuery] = useState("");
  const [entidad, setEntidad] = useState("");
  const [accion, setAccion] = useState("");
  const [usuarioId, setUsuarioId] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [page, setPage] = useState(1);

  const entries = useMemo(() => [...(data ?? [])].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime() || b.id - a.id), [data]);
  const entidades = useMemo(() => Array.from(new Set(entries.map((e) => e.entidad))).sort(), [entries]);
  const acciones = useMemo(() => Array.from(new Set(entries.map((e) => e.accion))).sort(), [entries]);

  const filtered = entries.filter((e) => {
    if (entidad && e.entidad !== entidad) return false;
    if (accion && e.accion !== accion) return false;
    if (usuarioId && String(e.usuarioId) !== usuarioId) return false;
    const dia = toDateInput(e.fecha);
    if (desde && dia < desde) return false;
    if (hasta && dia > hasta) return false;
    if (query) {
      const q = query.toLowerCase();
      return e.detalle.toLowerCase().includes(q) || (e.usuario?.nombre ?? "").toLowerCase().includes(q);
    }
    return true;
  });
  const shown = paginate(filtered, page, PAGE_SIZE);
  const step = clampPage(page, filtered.length, PAGE_SIZE);

  return (
    <div>
      <PageHeader
        title="Historial"
        description="Registro de acciones realizadas en el sistema. Solo lectura."
        action={
          <Button variant="secondary" onClick={() => mutate()} loading={isValidating && !isLoading}>
            <RefreshCw className="size-4" aria-hidden="true" />
            Actualizar
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <Input
            type="search"
            placeholder="Buscar en el detalle o usuario…"
            aria-label="Buscar en el historial"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Field label="Entidad" htmlFor="h-entidad">
          <Select id="h-entidad" value={entidad} onChange={(e) => { setEntidad(e.target.value); setPage(1); }} className="w-44">
            <option value="">Todas</option>
            {entidades.map((e) => (
              <option key={e} value={e}>{label(e)}</option>
            ))}
          </Select>
        </Field>
        <Field label="Acción" htmlFor="h-accion">
          <Select id="h-accion" value={accion} onChange={(e) => { setAccion(e.target.value); setPage(1); }} className="w-44">
            <option value="">Todas</option>
            {acciones.map((a) => (
              <option key={a} value={a}>{label(a)}</option>
            ))}
          </Select>
        </Field>
        <Field label="Usuario" htmlFor="h-usuario">
          <Select id="h-usuario" value={usuarioId} onChange={(e) => { setUsuarioId(e.target.value); setPage(1); }} className="w-44">
            <option value="">Todos</option>
            {(usuarios ?? []).map((u) => (
              <option key={u.id} value={u.id}>{u.nombre}</option>
            ))}
          </Select>
        </Field>
        <Field label="Desde" htmlFor="h-desde">
          <Input id="h-desde" type="date" value={desde} max={hasta || undefined} onChange={(e) => { setDesde(e.target.value); setPage(1); }} className="w-40" />
        </Field>
        <Field label="Hasta" htmlFor="h-hasta">
          <Input id="h-hasta" type="date" value={hasta} min={desde || undefined} onChange={(e) => { setHasta(e.target.value); setPage(1); }} className="w-40" />
        </Field>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorBanner message={getErrorMessage(error)} onRetry={() => mutate()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={entries.length ? "Sin resultados" : "Todavía no hay acciones registradas"}
          description={entries.length ? "Probá con otros filtros." : "Las acciones que hagas en el sistema van a aparecer acá."}
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-line bg-surface md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-background/60 text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Fecha</th>
                  <th scope="col" className="px-4 py-3 font-medium">Usuario</th>
                  <th scope="col" className="px-4 py-3 font-medium">Acción</th>
                  <th scope="col" className="px-4 py-3 font-medium">Entidad</th>
                  <th scope="col" className="px-4 py-3 font-medium">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {shown.map((e) => (
                  <tr key={e.id} className="align-top hover:bg-ink/5">
                    <td className="whitespace-nowrap px-4 py-3 text-muted tabular-nums">{formatDateTime(e.fecha)}</td>
                    <td className="px-4 py-3">{e.usuario?.nombre ?? `Usuario #${e.usuarioId}`}</td>
                    <td className="px-4 py-3"><Badge tone={accionTone(e.accion)}>{label(e.accion)}</Badge></td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {label(e.entidad)}{" "}
                      {e.entidad === "pedido" ? (
                        <Link to={`/pedidos?pedido=${e.entidadId}`} className="font-medium text-primary underline-offset-2 hover:underline">
                          #{e.entidadId}
                        </Link>
                      ) : (
                        <span className="text-muted">#{e.entidadId}</span>
                      )}
                    </td>
                    <td className="whitespace-pre-line px-4 py-3 text-pretty"><Detalle value={e.detalle} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="flex flex-col gap-3 md:hidden">
            {shown.map((e) => (
              <li key={e.id} className="rounded-xl border border-line bg-surface p-4">
                <div className="flex items-center justify-between gap-2">
                  <Badge tone={accionTone(e.accion)}>{label(e.accion)}</Badge>
                  <span className="text-xs text-muted">{formatDateTime(e.fecha)}</span>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm text-pretty"><Detalle value={e.detalle} /></p>
                <p className="mt-2 text-xs text-muted">
                  {label(e.entidad)}{" "}
                  {e.entidad === "pedido" ? (
                    <Link to={`/pedidos?pedido=${e.entidadId}`} className="font-medium text-primary underline-offset-2 hover:underline">
                      #{e.entidadId}
                    </Link>
                  ) : (
                    <>#{e.entidadId}</>
                  )}{" "}
                  · {e.usuario?.nombre ?? `Usuario #${e.usuarioId}`}
                </p>
              </li>
            ))}
          </ul>

          <Pagination
            total={filtered.length}
            page={step}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            noun={{ one: "acción", many: "acciones" }}
          />
        </>
      )}
    </div>
  );
}
