import { useEffect, useRef, useState } from "react";
import { Field, Input } from "@/components/ui";
import { cn, formatMoney } from "@/lib/format";
import {
  AYUDA_MARGEN_RECARGO,
  formatPorcentaje,
  gananciaUnitaria,
  margenSobreVenta,
  precioAlCambiarCosto,
  precioDesdeCosto,
  recargoDesdePrecio,
} from "@/lib/precio";

type Campo = "costo" | "porcentaje" | "precio";

function numero(valor: string): number | null {
  if (valor.trim() === "") return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

function textoNumero(valor: number): string {
  return String(Number(valor.toFixed(2)));
}

function porcentajeDesde(costo: string, precio: string): string {
  const c = numero(costo);
  const p = numero(precio);
  if (c === null || p === null) return "";
  const recargo = recargoDesdePrecio(c, p);
  return recargo === null ? "" : textoNumero(recargo);
}

export interface PrecioConRecargoProps {
  /** Valores como texto para que los inputs puedan quedar vacíos. */
  costo: string;
  precio: string;
  onChangeCosto: (valor: string) => void;
  onChangePrecio: (valor: string) => void;
  idPrefix: string;
  costoLabel?: string;
  precioLabel?: string;
  porcentajeLabel?: string;
  className?: string;
  disabled?: boolean;
  /** Marca el precio como obligatorio (formularios que antes lo exigían). */
  precioRequired?: boolean;
  /** Muestra la línea de ganancia / recargo / margen. */
  showResumen?: boolean;
  /** Texto extra debajo de los campos. */
  hint?: string;
}

/**
 * Costo, recargo porcentual y precio, siempre editables.
 * El último campo editado manda: si tocás costo o %, se recalcula el precio;
 * si tocás el precio, se recalcula el %.
 */
export function PrecioConRecargo({
  costo,
  precio,
  onChangeCosto,
  onChangePrecio,
  idPrefix,
  costoLabel = "Costo",
  precioLabel = "Precio",
  porcentajeLabel = "Recargo sobre costo",
  className,
  disabled,
  precioRequired,
  showResumen = true,
  hint,
}: PrecioConRecargoProps) {
  const [porcentaje, setPorcentaje] = useState(() => porcentajeDesde(costo, precio) || "0");
  const [ultimo, setUltimo] = useState<Campo>("precio");
  const emision = useRef<{ costo: string; precio: string } | null>(null);
  // Distingue un precio cargado a mano (se conserva al cambiar el costo) de
  // uno calculado automáticamente desde el costo o el recargo.
  const precioManual = useRef((numero(precio) ?? 0) > 0);

  // Si los valores cambian desde afuera (abrir el modal, elegir un producto),
  // recalculamos el % sin tocar el precio que cargó el usuario.
  useEffect(() => {
    const emitido = emision.current;
    if (emitido && emitido.costo === costo && emitido.precio === precio) {
      emision.current = null;
      return;
    }
    precioManual.current = (numero(precio) ?? 0) > 0;
    setPorcentaje(porcentajeDesde(costo, precio) || "0");
    setUltimo("precio");
  }, [costo, precio]);

  function cambiarCosto(valor: string) {
    setUltimo("costo");
    onChangeCosto(valor);
    const c = numero(valor);
    const p = numero(precio);
    const conservarPrecio = precioManual.current && p !== null && p > 0;
    if (c !== null) {
      const nuevoPrecio = textoNumero(
        precioAlCambiarCosto(c, conservarPrecio ? p : null, numero(porcentaje)),
      );
      const cambiaPrecio = nuevoPrecio !== precio;
      emision.current = { costo: valor, precio: cambiaPrecio ? nuevoPrecio : precio };
      if (cambiaPrecio) onChangePrecio(nuevoPrecio);
      // Si ya había un precio cargado a mano, se conserva y el recargo se recalcula.
      if (conservarPrecio) {
        setPorcentaje(porcentajeDesde(valor, precio) || "0");
      }
    } else {
      emision.current = { costo: valor, precio };
    }
  }

  function cambiarPorcentaje(valor: string) {
    setPorcentaje(valor);
    setUltimo("porcentaje");
    precioManual.current = false;
    const c = numero(costo);
    const pct = numero(valor);
    if (c !== null && pct !== null) {
      const nuevoPrecio = textoNumero(precioDesdeCosto(c, pct));
      emision.current = { costo, precio: nuevoPrecio };
      onChangePrecio(nuevoPrecio);
    }
  }

  function cambiarPrecio(valor: string) {
    setUltimo("precio");
    precioManual.current = (numero(valor) ?? 0) > 0;
    onChangePrecio(valor);
    setPorcentaje(porcentajeDesde(costo, valor) || "0");
    emision.current = { costo, precio: valor };
  }

  const c = numero(costo);
  const p = numero(precio);
  const precioCargado = p !== null && p > 0;
  const ganancia = c !== null && precioCargado ? gananciaUnitaria(c, p) : null;
  const recargo = c !== null && precioCargado ? recargoDesdePrecio(c, p) : null;
  const margen = c !== null && precioCargado ? margenSobreVenta(c, p) : null;

  const indicador =
    ultimo === "porcentaje"
      ? `Precio calculado desde el costo + ${porcentaje || "0"} %.`
      : precioCargado && c !== null
        ? `Recargo actual sobre el costo: ${formatPorcentaje(recargo)}.`
        : "El precio manda: el recargo se calcula solo cuando hay costo.";

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={costoLabel} htmlFor={`${idPrefix}-costo`}>
          <Input
            id={`${idPrefix}-costo`}
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={costo}
            onChange={(e) => cambiarCosto(e.target.value)}
            placeholder="Sin costo"
            disabled={disabled}
            className="text-right tabular-nums"
          />
        </Field>
        <Field label={porcentajeLabel} htmlFor={`${idPrefix}-porcentaje`}>
          <div className="relative">
            <Input
              id={`${idPrefix}-porcentaje`}
              type="number"
              step="0.1"
              inputMode="decimal"
              value={porcentaje}
              onChange={(e) => cambiarPorcentaje(e.target.value)}
              placeholder="Ej. 50"
              disabled={disabled}
              className="pr-8 text-right tabular-nums"
            />
            <span
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted"
              aria-hidden="true"
            >
              %
            </span>
          </div>
        </Field>
        <Field label={precioLabel} htmlFor={`${idPrefix}-precio`}>
          <Input
            id={`${idPrefix}-precio`}
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={precio}
            onChange={(e) => cambiarPrecio(e.target.value)}
            placeholder="Precio de venta"
            required={precioRequired}
            disabled={disabled}
            className="text-right tabular-nums"
          />
        </Field>
      </div>

      <p className="text-xs text-muted" aria-live="polite" title={AYUDA_MARGEN_RECARGO}>
        {indicador}
      </p>

      {showResumen && (
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted" title={AYUDA_MARGEN_RECARGO}>
          <span>
            Ganancia{" "}
            <strong className={cn("font-semibold tabular-nums", ganancia !== null && ganancia < 0 && "text-danger")}>
              {ganancia === null ? "—" : formatMoney(ganancia)}
            </strong>
          </span>
          <span>
            Recargo sobre costo <strong className="font-semibold tabular-nums">{formatPorcentaje(recargo)}</strong>
          </span>
          <span>
            Margen sobre venta <strong className="font-semibold tabular-nums">{formatPorcentaje(margen)}</strong>
          </span>
        </p>
      )}

      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}
