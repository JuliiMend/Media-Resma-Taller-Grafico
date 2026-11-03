import { HttpError } from "../utils/http-error";
import { formatearMoneda } from "./historial.helper";

/** Tolerancia para comparar montos con dos decimales. */
export const TOLERANCIA_SALDO = 0.005;

type TrabajoParaTotal = { cantidad: unknown; valorUnitario: unknown };

export const totalTrabajos = (trabajos: readonly TrabajoParaTotal[]) =>
  trabajos.reduce(
    (acc, t) => acc + Number(t.cantidad) * Number(t.valorUnitario),
    0
  );

const redondear = (valor: number) =>
  Math.round((valor + Number.EPSILON) * 100) / 100;

export interface PagoCalculado {
  /** Seña total después de aplicar el pago. */
  sena: number;
  /** Saldo pendiente después de aplicar el pago. */
  restaPagar: number;
  /** Monto que efectivamente se aplicó al saldo. */
  montoAplicado: number;
}

export interface DatosPago {
  estado: string;
  trabajos: readonly TrabajoParaTotal[];
  envio?: unknown;
  sena?: unknown;
  restaPagar?: unknown;
  monto?: number;
}

/**
 * Calcula el resultado de registrar un pago, sin tocar la base.
 *
 * - Pedidos con trabajos: el saldo surge de trabajos + envío - seña.
 * - Pedidos sin trabajos: el saldo es el `restaPagar` guardado (pedidos
 *   viejos cargados a mano). No se recalcula a partir de los trabajos.
 */
export function calcularPago({
  estado,
  trabajos,
  envio,
  sena,
  restaPagar,
  monto,
}: DatosPago): PagoCalculado {
  if (estado === "CANCELADO") {
    throw new HttpError(409, "No se pueden registrar pagos de un pedido cancelado");
  }

  const senaActual = redondear(Number(sena ?? 0));

  const saldo =
    trabajos.length > 0
      ? redondear(
          Math.max(
            0,
            totalTrabajos(trabajos) + Number(envio ?? 0) - senaActual
          )
        )
      : redondear(Math.max(0, Number(restaPagar ?? 0)));

  if (monto !== undefined && monto !== null) {
    if (!Number.isFinite(monto) || monto <= 0) {
      throw new HttpError(400, "El monto debe ser mayor a cero");
    }
  }

  if (saldo <= TOLERANCIA_SALDO) {
    if (monto === undefined || monto === null) {
      throw new HttpError(409, "El pedido no tiene saldo pendiente");
    }
    throw new HttpError(
      400,
      `El monto no puede superar el saldo pendiente (${formatearMoneda(saldo)})`
    );
  }

  const montoSolicitado = redondear(monto ?? saldo);
  if (montoSolicitado - saldo > TOLERANCIA_SALDO) {
    throw new HttpError(
      400,
      `El monto no puede superar el saldo pendiente (${formatearMoneda(saldo)})`
    );
  }

  // Si el monto viene con centavos de más dentro de la tolerancia, se topa al saldo.
  const montoAplicado = Math.min(montoSolicitado, saldo);
  const nuevoResta = redondear(Math.max(0, saldo - montoAplicado));

  return {
    sena: redondear(senaActual + montoAplicado),
    restaPagar: nuevoResta,
    montoAplicado,
  };
}
