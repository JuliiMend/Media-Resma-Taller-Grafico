import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui";
import { cn } from "@/lib/format";
import { resolverPeriodo } from "@/lib/reportes";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useUrlParams } from "@/lib/url-state";
import { PeriodoSelector } from "./reportes/PeriodoSelector";
import { ReportesBalance } from "./reportes/ReportesBalance";
import { ReportesRanking } from "./reportes/ReportesRanking";
import { ReportesVentas } from "./reportes/ReportesVentas";

type Tab = "ventas" | "ranking" | "balance";

const TABS: Array<{ value: Tab; label: string }> = [
  { value: "ventas", label: "Ventas" },
  { value: "ranking", label: "Ranking" },
  { value: "balance", label: "Balance" },
];

export function ReportesPage() {
  const { params, update } = useUrlParams();

  const tabParam = params.get("tab");
  const tab: Tab =
    tabParam === "ranking" ? "ranking" : tabParam === "balance" ? "balance" : "ventas";

  const periodo = resolverPeriodo(params);
  const periodoBalance = resolverPeriodo(params, "b", { permitirTodo: false });

  const qParam = params.get("q") ?? "";
  const [qInput, setQInput] = useState(qParam);
  const q = useDebouncedValue(qInput, 300).trim();

  useEffect(() => {
    if (qInput.trim() === "") {
      if (qParam !== "") update({ q: null, page: null, rpage: null });
      return;
    }
    if (q !== qParam) {
      update({ q, page: null, rpage: null });
    }
  }, [q, qInput, qParam, update]);

  const productoId = params.get("productoId") ?? "";

  function cambiarTab(next: Tab) {
    update({ tab: next === "ventas" ? null : next });
  }

  function cambiarProducto(valor: string) {
    update({ productoId: valor || null, page: null });
  }

  function cambiarQ(valor: string) {
    setQInput(valor);
  }

  function irARankingSinCosto() {
    setQInput("");
    update({ tab: "ranking", rfiltro: "sin-costo", q: null, rpage: null });
  }

  return (
    <div>
      <PageHeader
        title="Reportes"
        description="Ventas, ranking de rentabilidad y balance del período."
      />

      <nav
        aria-label="Secciones de reportes"
        className="mb-4 flex flex-wrap gap-1 rounded-xl border border-line bg-surface p-1"
      >
        {TABS.map((opcion) => (
          <button
            key={opcion.value}
            type="button"
            onClick={() => cambiarTab(opcion.value)}
            aria-current={tab === opcion.value ? "page" : undefined}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
              tab === opcion.value
                ? "bg-ink text-background"
                : "text-muted hover:bg-ink/5 hover:text-ink",
            )}
          >
            {opcion.label}
          </button>
        ))}
      </nav>

      {tab === "balance" ? (
        <>
          <PeriodoSelector periodo={periodoBalance} prefijo="b" permitirTodo={false} />
          <ReportesBalance periodo={periodoBalance} />
        </>
      ) : (
        <>
          <PeriodoSelector periodo={periodo} />
          {tab === "ventas" ? (
            <ReportesVentas
              periodo={periodo}
              q={q}
              qInput={qInput}
              onQChange={cambiarQ}
              productoId={productoId}
              onProductoChange={cambiarProducto}
              onIrARankingSinCosto={irARankingSinCosto}
            />
          ) : (
            <ReportesRanking
              periodo={periodo}
              q={q}
              qInput={qInput}
              onQChange={cambiarQ}
            />
          )}
        </>
      )}
    </div>
  );
}
