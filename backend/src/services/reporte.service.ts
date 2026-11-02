import { reporteRepository } from "../repositories/reporte.repository";
import {
  BalanceQueryInput,
  RankingQueryInput,
  ResumenQueryInput,
  VentasQueryInput,
} from "../schemas/reporte.schema";
import {
  margenSobreVenta,
  periodoAnterior,
  variacionPorcentual,
} from "./reporte.calculos";

function fechaHoyBA(): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((parte) => parte.type === tipo)?.value ?? "";
  return `${valor("year")}-${valor("month")}-${valor("day")}`;
}

function ultimoDiaDelMes(mes: string): string {
  const [anio, mesNumero] = mes.split("-").map(Number);
  const ultimo = new Date(Date.UTC(anio, mesNumero, 0)).getUTCDate();
  return `${mes}-${String(ultimo).padStart(2, "0")}`;
}

function resolverRango(desde?: string, hasta?: string) {
  const hastaFinal = hasta ?? fechaHoyBA();
  const desdeFinal = desde ?? `${hastaFinal.slice(0, 7)}-01`;
  return {
    desde: desdeFinal,
    hasta: hastaFinal > desdeFinal ? hastaFinal : desdeFinal,
  };
}

function rangoDelMesActual() {
  const hoy = fechaHoyBA();
  const mes = hoy.slice(0, 7);
  return { desde: `${mes}-01`, hasta: ultimoDiaDelMes(mes) };
}

function compararPeriodos(
  actual: { ingresos: number; costo: number; ganancia: number },
  anterior: { ingresos: number; costo: number; ganancia: number },
) {
  return {
    ingresos: variacionPorcentual(actual.ingresos, anterior.ingresos),
    costo: variacionPorcentual(actual.costo, anterior.costo),
    ganancia: variacionPorcentual(actual.ganancia, anterior.ganancia),
  };
}

export const reporteService = {
  ventas: ({ desde, hasta, productoId, q }: VentasQueryInput) => {
    const rango = resolverRango(desde, hasta);
    return reporteRepository.ventas(rango.desde, rango.hasta, productoId, q);
  },

  resumen: async ({
    desde,
    hasta,
    productoId,
    q,
    comparar = true,
  }: ResumenQueryInput) => {
    const rango = resolverRango(desde, hasta);
    const actual = await reporteRepository.totalesPeriodo(
      rango.desde,
      rango.hasta,
      productoId,
      q,
    );

    if (!comparar) {
      return { actual, anterior: null, variacion: null };
    }

    const previo = periodoAnterior(rango.desde, rango.hasta);
    const anterior = await reporteRepository.totalesPeriodo(
      previo.desde,
      previo.hasta,
      productoId,
      q,
    );

    return {
      actual,
      anterior,
      variacion: compararPeriodos(actual, anterior),
    };
  },

  ranking: ({
    desde,
    hasta,
    q,
    orden,
    dir,
    page,
    pageSize,
    filtro,
  }: RankingQueryInput) => {
    const rango = resolverRango(desde, hasta);
    return reporteRepository.ranking({
      desde: rango.desde,
      hasta: rango.hasta,
      q,
      orden,
      dir,
      page,
      pageSize,
      filtro,
    });
  },

  balance: async ({ desde, hasta }: BalanceQueryInput) => {
    const rango = desde || hasta ? resolverRango(desde, hasta) : rangoDelMesActual();
    const previo = periodoAnterior(rango.desde, rango.hasta);
    const [resultado, anterior] = await Promise.all([
      reporteRepository.balance(rango.desde, rango.hasta),
      reporteRepository.resumenBalance(previo.desde, previo.hasta),
    ]);
    const { actual } = resultado;

    return {
      ...resultado,
      anterior,
      variacion: {
        ingresos: variacionPorcentual(actual.ingresos, anterior.ingresos),
        costoTrabajos: variacionPorcentual(actual.costoTrabajos, anterior.costoTrabajos),
        gananciaBruta: variacionPorcentual(actual.gananciaBruta, anterior.gananciaBruta),
        gastos: variacionPorcentual(actual.gastos, anterior.gastos),
        comprasInsumos: variacionPorcentual(actual.comprasInsumos, anterior.comprasInsumos),
        resultado: variacionPorcentual(actual.resultado, anterior.resultado),
        cajaEstimada: variacionPorcentual(actual.cajaEstimada, anterior.cajaEstimada),
      },
      margen: margenSobreVenta(actual.gananciaBruta, actual.ingresos),
    };
  },
};
