/** Redondeo de dinero a 2 decimales, evitando errores de punto flotante. */
export function redondearDinero(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

/** Precio de venta a partir del costo y un recargo porcentual sobre el costo. */
export function precioDesdeCosto(costo: number, porcentaje: number): number {
  return redondearDinero(costo * (1 + porcentaje / 100));
}

/**
 * Recargo porcentual sobre el costo: (precio - costo) / costo × 100.
 * Devuelve null cuando falta un costo o un precio válido (> 0): un precio
 * vacío o en 0 todavía no está cargado y no debe mostrar -100%.
 */
export function recargoDesdePrecio(costo: number, precio: number): number | null {
  if (!Number.isFinite(costo) || !Number.isFinite(precio) || costo <= 0 || precio <= 0) return null;
  return ((precio - costo) / costo) * 100;
}

/**
 * Precio que corresponde al cambiar el costo.
 * Si todavía no hay precio cargado (> 0), se calcula desde el costo con el
 * recargo actual (0% por defecto). Si el usuario ya cargó un precio, se
 * conserva y el recargo se recalcula por separado.
 */
export function precioAlCambiarCosto(
  costo: number,
  precioActual: number | null,
  porcentajeActual: number | null = null,
): number {
  if (precioActual !== null && Number.isFinite(precioActual) && precioActual > 0) {
    return redondearDinero(precioActual);
  }
  return precioDesdeCosto(costo, porcentajeActual ?? 0);
}

/**
 * Margen porcentual sobre la venta: (precio - costo) / precio × 100.
 * Devuelve null cuando no hay un precio válido (> 0).
 */
export function margenSobreVenta(costo: number, precio: number): number | null {
  if (!Number.isFinite(costo) || !Number.isFinite(precio) || precio <= 0) return null;
  return ((precio - costo) / precio) * 100;
}

/** Ganancia unitaria en dinero, redondeada a 2 decimales. */
export function gananciaUnitaria(costo: number, precio: number): number {
  return redondearDinero(precio - costo);
}

const porcentajeFormatter = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 1,
});

/** Formatea un porcentaje para mostrar (ej. 266,7 %). */
export function formatPorcentaje(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return "—";
  return `${porcentajeFormatter.format(valor)} %`;
}

/** Texto corto que explica la diferencia entre margen y recargo. */
export const AYUDA_MARGEN_RECARGO =
  "Margen = ganancia / precio de venta. Recargo = ganancia / costo.";
