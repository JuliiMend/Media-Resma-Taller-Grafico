import type { ReactNode } from "react";
import { cn } from "@/lib/format";

/**
 * Ancho de la página dentro del Layout.
 * `wide` usa todo el ancho disponible; `narrow` centra el contenido en 896 px
 * para formularios y vistas de lectura que se ven mejor sin estirarse.
 */
export function PageContainer({
  size = "wide",
  className,
  children,
}: {
  size?: "wide" | "narrow";
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("w-full", size === "narrow" && "mx-auto max-w-4xl", className)}>
      {children}
    </div>
  );
}
