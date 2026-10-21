import { formatCantidad, formatMoney, toNumber } from "@/lib/format";
import { CONDICIONES_DEFAULT, VALIDEZ_DIAS_DEFAULT, type NegocioInfo } from "@/lib/presupuesto-config";

export { formatCantidad };

export type ModoCliente = "existente" | "libre";
export type ModoDescuento = "porcentaje" | "monto";

export interface LineaPresupuesto {
  /** Id estable para React (no se guarda en la base). */
  key: string;
  productoId: number | null;
  descripcion: string;
  cantidad: string;
  unidad: string;
  precioUnitario: string;
  /** "" cuando no hay costo cargado (producto sin costo o línea personalizada). */
  costoUnitario: string;
  personalizado: boolean;
}

export interface BorradorPresupuesto {
  modoCliente: ModoCliente;
  clienteId: string;
  clienteNombre: string;
  clienteTelefono: string;
  fechaEmision: string;
  validezDias: string;
  envio: string;
  modoDescuento: ModoDescuento;
  descuentoValor: string;
  plazoEntrega: string;
  condiciones: string;
  observaciones: string;
  lineas: LineaPresupuesto[];
}

export interface TotalesPresupuesto {
  subtotal: number;
  descuento: number;
  envio: number;
  total: number;
  /** Subtotal ya descontado (sin envío): base del margen. */
  baseConDescuento: number;
  costoTotal: number;
  ganancia: number;
  /** Margen % sobre la base con descuento. null si la base es 0. */
  margen: number | null;
  /** Cantidad de líneas cuyo precio está por debajo del costo. */
  lineasBajoCosto: number;
  /** El total con descuento está por debajo del costo total. */
  totalBajoCosto: boolean;
}

export interface LineaResumen {
  key: string;
  descripcion: string;
  cantidad: number;
  cantidadTexto: string;
  unidad: string;
  precioUnitario: number;
  subtotal: number;
}

export interface DatosPresupuestoPdf {
  numero: string;
  negocio: NegocioInfo;
  leyendaLegal: string;
  clienteNombre: string;
  clienteTelefono: string;
  fechaEmision: string;
  validoHasta: string;
  lineas: LineaResumen[];
  subtotal: number;
  descuento: number;
  descuentoTexto: string;
  envio: number;
  total: number;
  plazoEntrega: string;
  condiciones: string;
  observaciones: string;
}

let lineaSeq = 0;

export function nuevaLinea(): LineaPresupuesto {
  lineaSeq += 1;
  return {
    key: `l${lineaSeq}_${Math.random().toString(36).slice(2, 8)}`,
    productoId: null,
    descripcion: "",
    cantidad: "1",
    unidad: "unidad",
    precioUnitario: "",
    costoUnitario: "",
    personalizado: true,
  };
}

export function borradorVacio(): BorradorPresupuesto {
  return {
    modoCliente: "existente",
    clienteId: "",
    clienteNombre: "",
    clienteTelefono: "",
    fechaEmision: hoyISO(),
    validezDias: String(VALIDEZ_DIAS_DEFAULT),
    envio: "",
    modoDescuento: "porcentaje",
    descuentoValor: "",
    plazoEntrega: "",
    condiciones: CONDICIONES_DEFAULT,
    observaciones: "",
    lineas: [nuevaLinea()],
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Fecha local en formato yyyy-mm-dd. */
export function hoyISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Interpreta un yyyy-mm-dd como fecha local (evita el corrimiento de UTC). */
export function parseFechaLocal(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Suma días a un yyyy-mm-dd y devuelve otro yyyy-mm-dd. */
export function sumarDias(iso: string, dias: number): string {
  const d = parseFechaLocal(iso);
  if (!d) return "";
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Fecha local en formato dd/mm/aaaa. */
export function fechaCorta(iso: string): string {
  const d = parseFechaLocal(iso);
  if (!d) return "";
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Número de presupuesto: AAAAMMDD-HHMM. */
export function numeroPresupuesto(fecha: Date = new Date()): string {
  return `${fecha.getFullYear()}${pad(fecha.getMonth() + 1)}${pad(fecha.getDate())}-${pad(fecha.getHours())}${pad(fecha.getMinutes())}`;
}

const margenFormatter = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });

export function formatMargen(valor: number | null): string {
  if (valor === null || !Number.isFinite(valor)) return "—";
  return `${margenFormatter.format(valor)} %`;
}

/** Líneas con descripción y cantidad utilizables. */
export function lineasValidas(lineas: LineaPresupuesto[]): LineaPresupuesto[] {
  return lineas.filter((l) => l.descripcion.trim() !== "" && toNumber(l.cantidad) > 0);
}

/** Descuento global en pesos (el % se aplica sobre el subtotal). */
export function calcularDescuento(subtotal: number, modo: ModoDescuento, valor: string): number {
  const n = toNumber(valor);
  if (n <= 0) return 0;
  if (modo === "porcentaje") return (subtotal * Math.min(n, 100)) / 100;
  return Math.min(n, subtotal);
}

export function calcularTotales(borrador: BorradorPresupuesto): TotalesPresupuesto {
  const lineas = lineasValidas(borrador.lineas);
  const subtotal = lineas.reduce((s, l) => s + toNumber(l.cantidad) * toNumber(l.precioUnitario), 0);
  const descuento = calcularDescuento(subtotal, borrador.modoDescuento, borrador.descuentoValor);
  const envio = toNumber(borrador.envio);
  const total = subtotal - descuento + envio;
  const baseConDescuento = subtotal - descuento;

  let costoTotal = 0;
  let lineasBajoCosto = 0;
  for (const l of lineas) {
    if (l.costoUnitario === "") continue;
    const costo = toNumber(l.costoUnitario);
    costoTotal += costo * toNumber(l.cantidad);
    if (toNumber(l.precioUnitario) < costo) lineasBajoCosto += 1;
  }

  const ganancia = baseConDescuento - costoTotal;
  const margen = baseConDescuento > 0 ? (ganancia / baseConDescuento) * 100 : null;

  return {
    subtotal,
    descuento,
    envio,
    total,
    baseConDescuento,
    costoTotal,
    ganancia,
    margen,
    lineasBajoCosto,
    totalBajoCosto: costoTotal > 0 && baseConDescuento < costoTotal,
  };
}

/** Resumen de líneas para el PDF / WhatsApp. */
export function resumenLineas(borrador: BorradorPresupuesto): LineaResumen[] {
  return lineasValidas(borrador.lineas).map((l) => {
    const cantidad = toNumber(l.cantidad);
    const precioUnitario = toNumber(l.precioUnitario);
    return {
      key: l.key,
      descripcion: l.descripcion.trim(),
      cantidad,
      cantidadTexto: formatCantidad(cantidad),
      unidad: l.unidad,
      precioUnitario,
      subtotal: cantidad * precioUnitario,
    };
  });
}

/**
 * Reparte el descuento global en el valor unitario de cada línea (el pedido no tiene descuento).
 * El redondeo a 2 decimales se ajusta en la última línea para que el total cuadre.
 */
export function repartirDescuento(
  lineas: LineaPresupuesto[],
  subtotal: number,
  descuento: number,
): { key: string; valorUnitario: number }[] {
  if (subtotal <= 0) return lineas.map((l) => ({ key: l.key, valorUnitario: toNumber(l.precioUnitario) }));
  const factor = 1 - descuento / subtotal;
  const valores = lineas.map((l) => ({ key: l.key, valorUnitario: redondear(toNumber(l.precioUnitario) * factor) }));
  const suma = valores.reduce((s, v) => s + v.valorUnitario, 0);
  const diferencia = redondear(subtotal - descuento - suma);
  if (diferencia !== 0 && valores.length > 0) {
    const ultimo = valores[valores.length - 1];
    valores[valores.length - 1] = { ...ultimo, valorUnitario: redondear(ultimo.valorUnitario + diferencia) };
  }
  return valores;
}

export function redondear(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

/** Texto con formato de WhatsApp (*negrita*). Nunca incluye costos internos. */
export function textoWhatsApp(datos: {
  numero: string;
  negocio: string;
  clienteNombre: string;
  clienteTelefono: string;
  fechaEmision: string;
  validoHasta: string;
  lineas: LineaResumen[];
  subtotal: number;
  descuento: number;
  descuentoTexto: string;
  envio: number;
  total: number;
  plazoEntrega: string;
  condiciones: string;
}): string {
  const partes: string[] = [];
  partes.push("*PRESUPUESTO*");
  partes.push(datos.negocio);
  partes.push("");
  if (datos.clienteNombre) partes.push(`*Para:* ${datos.clienteNombre}`);
  if (datos.clienteTelefono) partes.push(`*Tel:* ${datos.clienteTelefono}`);
  partes.push(`*Nº:* ${datos.numero}`);
  partes.push(`*Fecha:* ${datos.fechaEmision}`);
  partes.push("");

  for (const l of datos.lineas) {
    partes.push(`• ${l.cantidadTexto} ${l.unidad} ${l.descripcion} — ${formatMoney(l.precioUnitario)} c/u = ${formatMoney(l.subtotal)}`);
  }
  partes.push("");

  partes.push(`*Subtotal:* ${formatMoney(datos.subtotal)}`);
  if (datos.descuento > 0) partes.push(`*Descuento${datos.descuentoTexto ? ` (${datos.descuentoTexto})` : ""}:* -${formatMoney(datos.descuento)}`);
  if (datos.envio > 0) partes.push(`*Envío:* ${formatMoney(datos.envio)}`);
  partes.push(`*TOTAL:* ${formatMoney(datos.total)}`);
  partes.push("");

  if (datos.plazoEntrega) partes.push(`*Plazo de entrega:* ${datos.plazoEntrega}`);
  if (datos.validoHasta) partes.push(`*Válido hasta:* ${datos.validoHasta}`);
  if (datos.condiciones) partes.push(`*Condiciones:* ${datos.condiciones}`);

  return partes.join("\n");
}

/** Nombre de archivo sanitizado: Presupuesto-<cliente o "sin-cliente">-<aaaa-mm-dd>.pdf */
export function nombreArchivoPresupuesto(cliente: string, fechaIso: string): string {
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(fechaIso) ? fechaIso : hoyISO();
  const base = cliente.trim() || "sin-cliente";
  const limpio = base
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
  return `Presupuesto-${limpio || "sin-cliente"}-${fecha}.pdf`;
}
