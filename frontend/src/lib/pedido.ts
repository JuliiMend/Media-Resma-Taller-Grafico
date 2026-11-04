import type { PedidoEtiquetaData } from "@/types";

const MAX_DETALLE = 60;

function limpiar(texto: string | null | undefined): string {
  return (texto ?? "").replace(/\s+/g, " ").trim();
}

function recortar(texto: string, max: number): string {
  if (texto.length <= max) return texto;
  return `${texto.slice(0, max - 1).trimEnd()}…`;
}

export function nombreClientePedido(pedido: PedidoEtiquetaData): string {
  return limpiar(pedido.cliente?.nombre) || "Sin cliente";
}

/** Observaciones recortadas, o los primeros trabajos/productos si no hay observaciones. */
export function detallePedido(pedido: PedidoEtiquetaData, max = MAX_DETALLE): string {
  const observaciones = limpiar(pedido.observaciones);
  if (observaciones) return recortar(observaciones, max);

  const nombres = (pedido.trabajos ?? [])
    .map((trabajo) => limpiar(trabajo.descripcion) || limpiar(trabajo.producto?.nombre))
    .filter(Boolean);

  if (nombres.length === 0) return "Sin detalle";

  const primeros = nombres.slice(0, 2).join(", ");
  const texto = nombres.length > 2 ? `${primeros} +${nombres.length - 2} más` : primeros;
  return recortar(texto, max);
}

export function etiquetaPedido(pedido: PedidoEtiquetaData): string {
  return `#${pedido.id} · ${nombreClientePedido(pedido)} · ${detallePedido(pedido)}`;
}

/** Fecha de entrega en formato dd/mm, sin año. */
export function fechaEntregaCorta(valor: string | null | undefined): string {
  if (!valor) return "";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "";
  const dia = String(fecha.getUTCDate()).padStart(2, "0");
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, "0");
  return `${dia}/${mes}`;
}

/** Texto secundario para el selector: "entrega 22/10". */
export function textoEntregaPedido(pedido: Pick<PedidoEtiquetaData, "fechaEntrega">): string | undefined {
  const fecha = fechaEntregaCorta(pedido.fechaEntrega);
  return fecha ? `entrega ${fecha}` : undefined;
}

/** Todo lo que debe encontrar el buscador, aunque no se muestre en la etiqueta. */
export function textoBusquedaPedido(pedido: PedidoEtiquetaData): string {
  const trabajos = (pedido.trabajos ?? []).flatMap((trabajo) => [
    trabajo.descripcion,
    trabajo.producto?.nombre,
  ]);
  return [
    `#${pedido.id}`,
    pedido.id,
    pedido.estado,
    pedido.cliente?.nombre,
    pedido.observaciones,
    ...trabajos,
  ]
    .filter((parte): parte is string => typeof parte === "string" && parte.trim() !== "")
    .join(" ");
}
