const MS_DIA = 86_400_000;

export interface Periodo {
  desde: string;
  hasta: string;
}

function parsearDia(fecha: string): number {
  const ms = Date.parse(`${fecha}T00:00:00.000Z`);
  if (!Number.isFinite(ms)) throw new Error(`Fecha inválida: ${fecha}`);
  return ms;
}

function aISO(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function ultimoDiaDelMes(anio: number, mesCero: number): number {
  return new Date(Date.UTC(anio, mesCero + 1, 0)).getUTCDate();
}

/** true cuando el rango es exactamente un mes calendario completo. */
export function esMesCompleto(desde: string, hasta: string): boolean {
  const inicio = new Date(parsearDia(desde));
  const fin = new Date(parsearDia(hasta));
  return (
    inicio.getUTCDate() === 1 &&
    inicio.getUTCFullYear() === fin.getUTCFullYear() &&
    inicio.getUTCMonth() === fin.getUTCMonth() &&
    fin.getUTCDate() === ultimoDiaDelMes(inicio.getUTCFullYear(), inicio.getUTCMonth())
  );
}

/**
 * Período inmediatamente anterior.
 * Si el rango es un mes calendario completo, devuelve el mes anterior.
 * En cualquier otro caso devuelve un rango de la misma cantidad de días.
 */
export function periodoAnterior(desde: string, hasta: string): Periodo {
  const inicio = parsearDia(desde);
  const fin = parsearDia(hasta);
  if (fin < inicio) throw new Error("El rango termina antes de empezar");

  if (esMesCompleto(desde, hasta)) {
    const fecha = new Date(inicio);
    const anio = fecha.getUTCFullYear();
    const mesCero = fecha.getUTCMonth();
    return {
      desde: aISO(Date.UTC(anio, mesCero - 1, 1)),
      hasta: aISO(Date.UTC(anio, mesCero, 0)),
    };
  }

  const dias = Math.round((fin - inicio) / MS_DIA) + 1;
  const anteriorHasta = inicio - MS_DIA;
  const anteriorDesde = anteriorHasta - (dias - 1) * MS_DIA;
  return { desde: aISO(anteriorDesde), hasta: aISO(anteriorHasta) };
}

/** Variación porcentual contra el período anterior. null si el anterior es 0. */
export function variacionPorcentual(
  actual: number,
  anterior: number,
): number | null {
  if (!Number.isFinite(actual) || !Number.isFinite(anterior) || anterior === 0) {
    return null;
  }
  return ((actual - anterior) / Math.abs(anterior)) * 100;
}

/** Margen sobre venta: ganancia / ingresos × 100. null si no hay ingresos. */
export function margenSobreVenta(
  ganancia: number,
  ingresos: number,
): number | null {
  if (!Number.isFinite(ganancia) || !Number.isFinite(ingresos) || ingresos === 0) {
    return null;
  }
  return (ganancia / ingresos) * 100;
}

/** Resultado del mes: ganancia bruta menos gastos. */
export function resultadoMensual(gananciaBruta: number, gastos: number): number {
  return gananciaBruta - gastos;
}

/** Caja estimada: ingresos menos compras de insumos y gastos. */
export function cajaEstimada(
  ingresos: number,
  comprasInsumos: number,
  gastos: number,
): number {
  return ingresos - comprasInsumos - gastos;
}
