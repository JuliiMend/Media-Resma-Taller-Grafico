/**
 * Redondea un monto a centavos.
 *
 * Los totales se arman multiplicando precios y cantidades en JS, así que
 * pueden quedar con residuos como 2299.9999999999995. Guardar eso como
 * restaPagar hace que el pedido aparezca como deuda de $0,00.
 */
export const redondearMoneda = (n: number) =>
  Math.round((n + Number.EPSILON) * 100) / 100;

/** Debajo de un centavo no se considera que haya deuda. */
export const UMBRAL_DEUDA = 0.01;

/** Redondea a centavos y convierte los residuos sub-centavo en 0. */
export const normalizarResta = (n: number) => {
  const redondeado = redondearMoneda(n);
  return redondeado < UMBRAL_DEUDA ? 0 : redondeado;
};
