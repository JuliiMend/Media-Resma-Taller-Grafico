import { toNumber } from "@/lib/format";
import type { Pedido } from "@/types";

/** Debajo de un centavo no se considera que haya deuda. */
export const UMBRAL_DEUDA = 0.01;

/**
 * Condición única de deuda en el frontend. Debe coincidir con el backend:
 * pedido no cancelado y restaPagar de al menos un centavo.
 */
export function tieneDeuda(
  p: Pick<Pedido, "estado" | "restaPagar">,
): boolean {
  return p.estado !== "CANCELADO" && toNumber(p.restaPagar) >= UMBRAL_DEUDA;
}
