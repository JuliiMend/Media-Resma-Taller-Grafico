import type { ReactNode } from "react";
import { cn, formatMoney } from "@/lib/format";
import { formatPuntos, formatVariacion } from "@/lib/reportes";

export function SkeletonCards({ cantidad = 4 }: { cantidad?: number }) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: cantidad }).map((_, i) => (
        <div
          key={i}
          className="h-24 animate-pulse rounded-xl border border-line bg-surface"
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export function SkeletonTabla({ filas = 6 }: { filas?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="h-10 animate-pulse border-b border-line bg-background/60" />
      {Array.from({ length: filas }).map((_, i) => (
        <div key={i} className="h-11 animate-pulse border-b border-line last:border-0" />
      ))}
    </div>
  );
}

export function Variacion({
  valor,
  actual,
  anterior,
  etiqueta,
  inverso = false,
  puntos = false,
}: {
  valor: number | null;
  actual: number;
  anterior: number | null | undefined;
  etiqueta: string | null;
  inverso?: boolean;
  puntos?: boolean;
}) {
  if (!etiqueta || anterior === null || anterior === undefined) {
    return <span className="text-xs text-muted">{etiqueta ?? "Sin comparación"}</span>;
  }
  if (valor === null) {
    if (actual === 0) {
      return <span className="text-xs text-muted">— {etiqueta}</span>;
    }
    return (
      <span className={cn("text-xs font-medium", inverso ? "text-danger" : "text-success")}>
        nuevo <span className="font-normal text-muted">{etiqueta}</span>
      </span>
    );
  }

  const sube = valor >= 0;
  const favorable = inverso ? !sube : sube;
  return (
    <span
      className={cn(
        "text-xs font-medium tabular-nums",
        valor === 0 ? "text-muted" : favorable ? "text-success" : "text-danger",
      )}
    >
      {valor === 0 ? "—" : sube ? "▲" : "▼"}{" "}
      {puntos ? formatPuntos(valor) : formatVariacion(valor)}{" "}
      <span className="font-normal text-muted">{etiqueta}</span>
    </span>
  );
}

export function TarjetaTotal({
  label,
  value,
  children,
  destacada = false,
  tono,
  ayuda,
}: {
  label: string;
  value: string;
  children?: ReactNode;
  destacada?: boolean;
  tono?: "success" | "danger";
  ayuda?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-line bg-surface px-4 py-3",
        destacada && "border-2",
        destacada && tono === "danger" && "border-danger/40",
        destacada && tono !== "danger" && "border-success/40",
      )}
      title={ayuda}
    >
      <p className="text-xs text-muted">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-lg font-semibold tabular-nums",
          tono === "danger" && "text-danger",
          tono === "success" && "text-success",
        )}
      >
        {value}
      </p>
      {children && <div className="mt-1">{children}</div>}
    </div>
  );
}

export function AyudaTexto({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-xs text-muted text-pretty">{children}</p>;
}

export function ValorMoneda({ value }: { value: number }) {
  return <span className="tabular-nums">{formatMoney(value)}</span>;
}
