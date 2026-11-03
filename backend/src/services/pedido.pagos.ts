import { HttpError } from "../utils/http-error";
import {
  normalizarResta,
  redondearMoneda,
  UMBRAL_DEUDA,
} from "../utils/dinero";
import { formatearMoneda } from "./historial.helper";

/** Tolerancia para aceptar centavos de más al comparar montos. */
const TOLERANCIA_MONTO = 0.005;

type TrabajoParaTotal = { cantidad: unknown; valorUnitario: unknown };

export const totalTrabajos = (trabajos: readonly TrabajoParaTotal[]) =>
  trabajos.reduce(
    (acc, t) => acc + Number(t.cantidad) * Number(t.valorUnitario),
    0
  );

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

  const senaActual = redondearMoneda(Number(sena ?? 0));

  const total = redondearMoneda(
    totalTrabajos(trabajos) + Number(envio ?? 0)
  );

  const saldo =
    trabajos.length > 0
      ? normalizarResta(total - senaActual)
      : normalizarResta(Number(restaPagar ?? 0));

  if (monto !== undefined && monto !== null) {
    if (!Number.isFinite(monto) || monto <= 0) {
      throw new HttpError(400, "El monto debe ser mayor a cero");
    }
  }

  if (saldo < UMBRAL_DEUDA) {
    if (monto === undefined || monto === null) {
      throw new HttpError(409, "El pedido no tiene saldo pendiente");
    }
    throw new HttpError(
      400,
      `El monto no puede superar el saldo pendiente (${formatearMoneda(saldo)})`
    );
  }

  const montoSolicitado = redondearMoneda(monto ?? saldo);
  if (montoSolicitado - saldo > TOLERANCIA_MONTO) {
    throw new HttpError(
      400,
      `El monto no puede superar el saldo pendiente (${formatearMoneda(saldo)})`
    );
  }

  // Si el monto viene con centavos de más dentro de la tolerancia, se topa al saldo.
  const montoAplicado = Math.min(montoSolicitado, saldo);
  const nuevoResta = normalizarResta(saldo - montoAplicado);

  return {
    sena: redondearMoneda(senaActual + montoAplicado),
    restaPagar: nuevoResta,
    montoAplicado,
  };
}
