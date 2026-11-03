import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button, Field, Input, Modal } from "@/components/ui";
import { useUrlParams } from "@/lib/url-state";
import {
  labelMes,
  mesActual,
  mesAnterior,
  mesSiguiente,
  type PeriodoResuelto,
} from "@/lib/reportes";

function botonModo(activo: boolean) {
  return activo
    ? "bg-ink text-background"
    : "text-muted hover:bg-ink/5 hover:text-ink";
}

export function PeriodoSelector({
  periodo,
  prefijo = "",
  permitirTodo = true,
}: {
  periodo: PeriodoResuelto;
  prefijo?: string;
  permitirTodo?: boolean;
}) {
  const { update } = useUrlParams();
  const [selectorAbierto, setSelectorAbierto] = useState(false);
  const [mesBorrador, setMesBorrador] = useState(periodo.mes);

  useEffect(() => {
    setMesBorrador(periodo.mes);
  }, [periodo.mes]);

  function actualizar(updates: Record<string, string | null>) {
    update({
      ...updates,
      page: null,
      rpage: null,
      bcpage: null,
      bgpage: null,
    });
  }

  function cambiarModo(modo: "mes" | "rango" | "todo") {
    if (modo === "todo") {
      actualizar({
        [`${prefijo}modo`]: "todo",
        [`${prefijo}mes`]: null,
        [`${prefijo}desde`]: null,
        [`${prefijo}hasta`]: null,
      });
      return;
    }
    if (modo === "rango") {
      actualizar({
        [`${prefijo}modo`]: "rango",
        [`${prefijo}mes`]: null,
        [`${prefijo}desde`]: periodo.rango.desde,
        [`${prefijo}hasta`]: periodo.rango.hasta,
      });
      return;
    }
    actualizar({
      [`${prefijo}modo`]: "mes",
      [`${prefijo}mes`]: periodo.mes,
      [`${prefijo}desde`]: null,
      [`${prefijo}hasta`]: null,
    });
  }

  function cambiarMes(mes: string) {
    actualizar({
      [`${prefijo}modo`]: "mes",
      [`${prefijo}mes`]: mes,
      [`${prefijo}desde`]: null,
      [`${prefijo}hasta`]: null,
    });
  }

  const esMesActual = periodo.mes >= mesActual();

  return (
    <div className="mb-6 rounded-2xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-line bg-background/60 p-1">
          <button
            type="button"
            onClick={() => cambiarModo("mes")}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${botonModo(periodo.modo === "mes")}`}
          >
            Mes
          </button>
          <button
            type="button"
            onClick={() => cambiarModo("rango")}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${botonModo(periodo.modo === "rango")}`}
          >
            Rango personalizado
          </button>
          {permitirTodo && (
            <button
              type="button"
              onClick={() => cambiarModo("todo")}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${botonModo(periodo.modo === "todo")}`}
            >
              Todo el período
            </button>
          )}
        </div>

        {periodo.modo === "mes" && (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => cambiarMes(mesAnterior(periodo.mes))}
              aria-label="Mes anterior"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </Button>
            <button
              type="button"
              onClick={() => setSelectorAbierto(true)}
              className="min-w-44 rounded-lg px-3 py-2 text-sm font-semibold capitalize transition-colors hover:bg-ink/5"
              title="Elegir mes y año"
            >
              {labelMes(periodo.mes)}
            </button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => cambiarMes(mesSiguiente(periodo.mes))}
              disabled={esMesActual}
              aria-label="Mes siguiente"
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        )}

        {periodo.modo === "rango" && (
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Desde" htmlFor={`${prefijo || "rep"}-desde`}>
              <Input
                id={`${prefijo || "rep"}-desde`}
                type="date"
                value={periodo.rango.desde}
                max={periodo.rango.hasta}
                onChange={(e) =>
                  actualizar({
                    [`${prefijo}modo`]: "rango",
                    [`${prefijo}desde`]: e.target.value,
                    [`${prefijo}hasta`]: periodo.rango.hasta,
                  })
                }
                className="w-40"
              />
            </Field>
            <Field label="Hasta" htmlFor={`${prefijo || "rep"}-hasta`}>
              <Input
                id={`${prefijo || "rep"}-hasta`}
                type="date"
                value={periodo.rango.hasta}
                min={periodo.rango.desde}
                onChange={(e) =>
                  actualizar({
                    [`${prefijo}modo`]: "rango",
                    [`${prefijo}desde`]: periodo.rango.desde,
                    [`${prefijo}hasta`]: e.target.value,
                  })
                }
                className="w-40"
              />
            </Field>
          </div>
        )}

        {periodo.modo === "todo" && (
          <p className="text-sm text-muted">Todo el historial</p>
        )}
      </div>

      <Modal
        open={selectorAbierto}
        onClose={() => setSelectorAbierto(false)}
        title="Elegir mes"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setSelectorAbierto(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (mesBorrador) cambiarMes(mesBorrador);
                setSelectorAbierto(false);
              }}
            >
              Aplicar
            </Button>
          </div>
        }
      >
        <Field label="Mes y año" htmlFor="selector-mes">
          <Input
            id="selector-mes"
            type="month"
            value={mesBorrador}
            max={mesActual()}
            onChange={(e) => setMesBorrador(e.target.value)}
          />
        </Field>
      </Modal>
    </div>
  );
}
