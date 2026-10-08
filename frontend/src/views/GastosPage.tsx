import { useMemo, useState } from "react";
import useSWR from "swr";
import { X } from "lucide-react";
import { fetcher } from "@/api/client";
import { CrudPage } from "@/components/CrudPage";
import { Button, Field, Input, Select } from "@/components/ui";
import { formatDate, formatMoney, toDateInput, toNumber } from "@/lib/format";
import { MEDIOS_PAGO_SUGERIDOS } from "@/lib/medios-pago";
import type { Gasto } from "@/types";

const SIN_MEDIO = "__sin_medio__";

export function GastosPage() {
  const { data } = useSWR<Gasto[]>("/gastos", fetcher);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [medio, setMedio] = useState("");

  const medios = useMemo(() => {
    const used = (data ?? []).map((g) => g.medioPago).filter((m): m is string => Boolean(m));
    return Array.from(new Set(used)).sort((a, b) => a.localeCompare(b, "es"));
  }, [data]);

  const hasFilters = Boolean(desde || hasta || medio);

  function matches(g: Gasto): boolean {
    const day = toDateInput(g.fecha);
    if (desde && day < desde) return false;
    if (hasta && day > hasta) return false;
    if (medio === SIN_MEDIO) return !g.medioPago;
    if (medio) return g.medioPago === medio;
    return true;
  }

  return (
    <CrudPage<Gasto>
      title="Gastos"
      description="Registro de gastos del taller. Filtrá por fecha y medio de pago."
      endpoint="/gastos"
      singular="gasto"
      searchKeys={["concepto", "medioPago"]}
      predicate={matches}
      toolbar={
        <>
          <Field label="Desde" htmlFor="gastos-desde">
            <Input id="gastos-desde" type="date" value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.target.value)} className="w-40" />
          </Field>
          <Field label="Hasta" htmlFor="gastos-hasta">
            <Input id="gastos-hasta" type="date" value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)} className="w-40" />
          </Field>
          <Field label="Medio de pago" htmlFor="gastos-medio">
            <Select id="gastos-medio" value={medio} onChange={(e) => setMedio(e.target.value)} className="w-52">
              <option value="">Todos</option>
              {medios.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
              <option value={SIN_MEDIO}>Sin especificar</option>
            </Select>
          </Field>
          {hasFilters && (
            <Button
              variant="ghost"
              onClick={() => {
                setDesde("");
                setHasta("");
                setMedio("");
              }}
            >
              <X className="size-4" aria-hidden="true" />
              Limpiar filtros
            </Button>
          )}
        </>
      }
      summary={(items, filtered) => {
        const total = filtered.reduce((s, g) => s + toNumber(g.monto), 0);
        const porMedio = new Map<string, number>();
        for (const g of filtered) {
          const key = g.medioPago || "Sin especificar";
          porMedio.set(key, (porMedio.get(key) ?? 0) + toNumber(g.monto));
        }
        return (
          <div className="flex flex-wrap gap-3">
            <div className="flex min-w-48 flex-col rounded-xl border border-line bg-surface px-5 py-4">
              <span className="text-xs text-muted">{hasFilters ? "Total filtrado" : "Total registrado"}</span>
              <span className="text-xl font-semibold tabular-nums">{formatMoney(total)}</span>
              <span className="mt-1 text-xs text-muted">
                {hasFilters ? `${filtered.length} de ${items.length} gastos` : `${items.length} ${items.length === 1 ? "gasto" : "gastos"}`}
              </span>
            </div>
            {porMedio.size > 0 && (
              <div className="flex min-w-48 flex-1 flex-col gap-1.5 rounded-xl border border-line bg-surface px-5 py-4">
                <span className="text-xs text-muted">Por medio de pago</span>
                <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                  {Array.from(porMedio.entries())
                    .sort((a, b) => b[1] - a[1])
                    .map(([name, amount]) => (
                      <li key={name} className="flex items-baseline gap-2">
                        <span className="text-muted">{name}</span>
                        <span className="font-medium tabular-nums">{formatMoney(amount)}</span>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        );
      }}
      fields={[
        { name: "concepto", label: "Concepto", type: "text", required: true, fullWidth: true },
        { name: "monto", label: "Monto", type: "number", required: true },
        { name: "fecha", label: "Fecha", type: "date", defaultValue: new Date().toISOString().slice(0, 10) },
        {
          name: "medioPago",
          label: "Medio de pago",
          type: "text",
          placeholder: "Efectivo, transferencia…",
          fullWidth: true,
          suggestions: Array.from(new Set([...MEDIOS_PAGO_SUGERIDOS, ...medios])),
        },
      ]}
      columns={[
        { label: "Concepto", render: (g) => g.concepto, primary: true },
        { label: "Fecha", render: (g) => formatDate(g.fecha) },
        { label: "Medio de pago", render: (g) => g.medioPago || "—" },
        { label: "Monto", align: "right", render: (g) => formatMoney(g.monto) },
      ]}
    />
  );
}
