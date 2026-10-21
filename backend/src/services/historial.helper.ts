import { Prisma } from "@prisma/client";
import { HttpError } from "../utils/http-error";
import { getUsuarioId } from "../utils/request-context";

// TODO: al sumar historial a otras entidades (tareas, compras, gastos, etc.)
// reutilizar registrarHistorial dentro de la transacción de cada servicio.

export type AccionHistorial = "CREAR" | "EDITAR" | "ELIMINAR" | "CAMBIO_ESTADO";

export const ETIQUETAS_PEDIDO: Record<string, string> = {
  clienteId: "Cliente",
  usuarioId: "Usuario",
  fecha: "Fecha",
  estado: "Estado",
  fechaEntrega: "Fecha de entrega",
  sena: "Seña",
  restaPagar: "Resta a pagar",
  medioPago: "Medio de pago",
  envio: "Envío",
  observaciones: "Observaciones",
  canalVenta: "Canal de venta",
};

export const ETIQUETAS_TRABAJO: Record<string, string> = {
  pedidoId: "Pedido",
  productoId: "Producto",
  descripcion: "Descripción",
  cantidad: "Cantidad",
  valorUnitario: "Valor unitario",
  estadoProducto: "Estado del producto",
  costoUnitario: "Costo unitario",
};

const CAMPOS_MONEDA = new Set(["sena", "restaPagar", "envio", "valorUnitario", "costoUnitario"]);

export function formatearMoneda(valor: unknown): string {
  const numero = aNumero(valor);
  if (numero === null) return "—";
  return `$${numero.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatearCantidad(valor: unknown): string {
  const numero = aNumero(valor);
  if (numero === null) return "—";
  return numero.toLocaleString("es-AR", { maximumFractionDigits: 2 });
}

export function formatearFecha(valor: Date): string {
  const dia = String(valor.getUTCDate()).padStart(2, "0");
  const mes = String(valor.getUTCMonth() + 1).padStart(2, "0");
  return `${dia}/${mes}/${valor.getUTCFullYear()}`;
}

export function describirCambios(
  antes: object,
  despues: object,
  etiquetas: Record<string, string>
): string {
  const previo = antes as Record<string, unknown>;
  const nuevo = despues as Record<string, unknown>;
  const lineas: string[] = [];
  for (const [campo, etiqueta] of Object.entries(etiquetas)) {
    if (!(campo in nuevo)) continue;
    if (sonIguales(previo[campo], nuevo[campo])) continue;
    lineas.push(`${etiqueta}: ${formatearValor(campo, previo[campo])} → ${formatearValor(campo, nuevo[campo])}`);
  }
  return lineas.join("\n");
}

export async function registrarHistorial(
  db: Prisma.TransactionClient,
  entrada: {
    accion: AccionHistorial;
    entidad: string;
    entidadId: number;
    detalle: string;
  }
): Promise<void> {
  const usuarioId = getUsuarioId();
  if (!usuarioId) throw new HttpError(401, "No autenticado");
  await db.historial.create({ data: { ...entrada, usuarioId } });
}

function formatearValor(campo: string, valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  if (valor instanceof Date) return formatearFecha(valor);
  if (typeof valor === "boolean") return valor ? "Sí" : "No";
  if (esDecimal(valor) || typeof valor === "number" || typeof valor === "bigint") {
    return CAMPOS_MONEDA.has(campo) ? formatearMoneda(valor) : formatearCantidad(valor);
  }
  return String(valor);
}

function sonIguales(a: unknown, b: unknown): boolean {
  return normalizar(a) === normalizar(b);
}

function normalizar(valor: unknown): unknown {
  if (valor === null || valor === undefined) return null;
  if (valor instanceof Date) return valor.getTime();
  if (esDecimal(valor)) return Number(valor);
  if (typeof valor === "object") return JSON.stringify(valor);
  return valor;
}

function aNumero(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === "") return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

function esDecimal(valor: unknown): valor is Prisma.Decimal {
  return Prisma.Decimal.isDecimal(valor);
}
