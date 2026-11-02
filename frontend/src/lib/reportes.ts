export type ModoPeriodo = "mes" | "rango" | "todo";

export interface RangoPeriodo {
  desde: string;
  hasta: string;
}

const MS_DIA = 86_400_000;
const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const FORMATO_MES = /^\d{4}-(0[1-9]|1[0-2])$/;

export function hoyBA(): string {
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

export function mesActual(): string {
  return hoyBA().slice(0, 7);
}

export function esMesValido(valor: string | null | undefined): valor is string {
  return Boolean(valor && FORMATO_MES.test(valor));
}

export function esFechaValida(valor: string | null | undefined): valor is string {
  if (!valor || !FORMATO_FECHA.test(valor)) return false;
  return Number.isFinite(Date.parse(`${valor}T00:00:00.000Z`));
}

export function rangoDeMes(mes: string): RangoPeriodo {
  const [anio, mesNumero] = mes.split("-").map(Number);
  const ultimo = new Date(Date.UTC(anio, mesNumero, 0)).getUTCDate();
  return {
    desde: `${mes}-01`,
    hasta: `${mes}-${String(ultimo).padStart(2, "0")}`,
  };
}

export function mesAnterior(mes: string): string {
  const [anio, mesNumero] = mes.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mesNumero - 2, 1));
  return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function mesSiguiente(mes: string): string {
  const [anio, mesNumero] = mes.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mesNumero, 1));
  return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function labelMes(mes: string): string {
  const fecha = new Date(`${mes}-01T00:00:00Z`);
  if (Number.isNaN(fecha.getTime())) return mes;
  const texto = fecha.toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function labelMesCorto(mes: string): string {
  const fecha = new Date(`${mes}-01T00:00:00Z`);
  if (Number.isNaN(fecha.getTime())) return mes;
  return fecha.toLocaleDateString("es-AR", { month: "long", timeZone: "UTC" });
}

export interface PeriodoResuelto {
  modo: ModoPeriodo;
  mes: string;
  rango: RangoPeriodo;
  comparar: boolean;
}

/**
 * Lee el período desde la URL. El prefijo permite tener un selector compartido
 * (Ventas/Ranking) y otro independiente (Balance) sin pisarse.
 */
export function resolverPeriodo(
  params: URLSearchParams,
  prefijo = "",
  opciones: { permitirTodo?: boolean } = {},
): PeriodoResuelto {
  const modoParam = params.get(`${prefijo}modo`);
  const modo: ModoPeriodo =
    modoParam === "rango"
      ? "rango"
      : modoParam === "todo" && opciones.permitirTodo !== false
        ? "todo"
        : "mes";

  const mesParam = params.get(`${prefijo}mes`);
  const mes = esMesValido(mesParam) ? mesParam : mesActual();
  const rangoMes = rangoDeMes(mes);

  if (modo === "todo") {
    return {
      modo,
      mes,
      rango: { desde: "2000-01-01", hasta: hoyBA() },
      comparar: false,
    };
  }

  if (modo === "rango") {
    const desdeParam = params.get(`${prefijo}desde`);
    const hastaParam = params.get(`${prefijo}hasta`);
    const desde = esFechaValida(desdeParam) ? desdeParam : rangoMes.desde;
    const hasta = esFechaValida(hastaParam) ? hastaParam : rangoMes.hasta;
    return {
      modo,
      mes,
      rango: desde <= hasta ? { desde, hasta } : { desde: hasta, hasta: desde },
      comparar: true,
    };
  }

  return { modo, mes, rango: rangoMes, comparar: true };
}

export function etiquetaComparacion(
  periodo: PeriodoResuelto,
): string | null {
  if (periodo.modo === "todo") return null;
  if (periodo.modo === "mes") return `vs. ${labelMesCorto(mesAnterior(periodo.mes))}`;
  return "vs. período anterior";
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

export function diferenciaPuntos(
  actual: number | null | undefined,
  anterior: number | null | undefined,
): number | null {
  if (
    actual === null ||
    actual === undefined ||
    anterior === null ||
    anterior === undefined ||
    !Number.isFinite(actual) ||
    !Number.isFinite(anterior)
  ) {
    return null;
  }
  return actual - anterior;
}

const variacionFormatter = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 1,
});

export function formatVariacion(valor: number | null): string {
  if (valor === null || !Number.isFinite(valor)) return "—";
  return `${variacionFormatter.format(Math.abs(valor))} %`;
}

export function formatPuntos(valor: number | null): string {
  if (valor === null || !Number.isFinite(valor)) return "—";
  return `${variacionFormatter.format(Math.abs(valor))} pp`;
}

export function sumarDias(fecha: string, dias: number): string {
  const ms = Date.parse(`${fecha}T00:00:00.000Z`);
  return new Date(ms + dias * MS_DIA).toISOString().slice(0, 10);
}
