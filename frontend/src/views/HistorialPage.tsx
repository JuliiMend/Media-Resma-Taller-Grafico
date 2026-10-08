import { useMemo, useState } from "react";
import useSWR from "swr";
import { RefreshCw, Search } from "lucide-react";
import { fetcher, getErrorMessage } from "@/api/client";
import { Badge, Button, EmptyState, ErrorBanner, Field, Input, LoadingState, PageHeader, Select } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import type { HistorialEntry } from "@/types";

const PAGE_SIZE = 50;

const accionTone = (accion: string) => {
  if (accion === "CREAR" || accion === "COMPLETAR") return "success" as const;
  if (accion === "ELIMINAR") return "danger" as const;
  if (accion === "EDITAR" || accion === "CAMBIO_ESTADO") return "primary" as const;
  return "neutral" as const;
};

const label = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase().replace(/_/g, " ");

export function HistorialPage() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<HistorialEntry[]>("/historial", fetcher);
  const [query, setQuery] = useState("");
  const [entidad, setEntidad] = useState("");
  const [accion, setAccion] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const entries = useMemo(() => [...(data ?? [])].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime() || b.id - a.id), [data]);
  const entidades = useMemo(() => Array.from(new Set(entries.map((e) => e.entidad))).sort(), [entries]);
  const acciones = useMemo(() => Array.from(new Set(entries.map((e) => e.accion))).sort(), [entries]);

  const filtered = entries.filter((e) => {
    if (entidad && e.entidad !== entidad) return false;
    if (accion && e.accion !== accion) return false;
    if (query) {
      const q = query.toLowerCase();
      return e.detalle.toLowerCase().includes(q) || (e.usuario?.nombre ?? "").toLowerCase().includes(q);
    }
    return true;
  });
  const shown = filtered.slice(0, visible);

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
              setVisible(PAGE_SIZE);
            }}
            className="pl-9"
          />
        </div>
        <Field label="Entidad" htmlFor="h-entidad">
          <Select id="h-entidad" value={entidad} onChange={(e) => { setEntidad(e.target.value); setVisible(PAGE_SIZE); }} className="w-44">
            <option value="">Todas</option>
            {entidades.map((e) => (
              <option key={e} value={e}>{label(e)}</option>
            ))}
          </Select>
        </Field>
        <Field label="Acción" htmlFor="h-accion">
          <Select id="h-accion" value={accion} onChange={(e) => { setAccion(e.target.value); setVisible(PAGE_SIZE); }} className="w-44">
            <option value="">Todas</option>
            {acciones.map((a) => (
              <option key={a} value={a}>{label(a)}</option>
            ))}
          </Select>
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
                    <td className="whitespace-nowrap px-4 py-3">{label(e.entidad)} <span className="text-muted">#{e.entidadId}</span></td>
                    <td className="px-4 py-3 text-pretty">{e.detalle}</td>
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
                <p className="mt-2 text-sm text-pretty">{e.detalle}</p>
                <p className="mt-2 text-xs text-muted">
                  {label(e.entidad)} #{e.entidadId} · {e.usuario?.nombre ?? `Usuario #${e.usuarioId}`}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-center justify-between text-sm text-muted">
            <span>
              Mostrando {shown.length} de {filtered.length}
            </span>
            {shown.length < filtered.length && (
              <Button variant="secondary" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                Mostrar más
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
