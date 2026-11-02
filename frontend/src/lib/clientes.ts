import type { Cliente, Pedido } from "@/types";

type PedidoConCliente = Pick<Pedido, "clienteId" | "cliente">;

/** Cliente embebido en el pedido o, como respaldo, el mapa de /clientes. */
export function clienteDe(
  pedido: PedidoConCliente,
  clientesById?: Map<number, Cliente>,
): Cliente | undefined {
  return pedido.cliente ?? clientesById?.get(pedido.clienteId);
}

/**
 * Nombre visible del cliente. El backend ya embebe el cliente en cada pedido,
 * así que no dependemos de que el listado de /clientes haya cargado.
 */
export function nombreCliente(
  pedido: PedidoConCliente,
  clientesById?: Map<number, Cliente>,
): string {
  return clienteDe(pedido, clientesById)?.nombre ?? "Cliente eliminado";
}

/**
 * true cuando todavía no hay forma de resolver el nombre porque el listado de
 * clientes sigue cargando. En ese caso conviene mostrar un skeleton, no "#id".
 */
export function clientePendiente(
  pedido: PedidoConCliente,
  clientesById: Map<number, Cliente> | undefined,
  cargando: boolean,
): boolean {
  return cargando && !pedido.cliente && !clientesById?.has(pedido.clienteId);
}
