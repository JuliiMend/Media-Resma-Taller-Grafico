export const ESTADOS_PEDIDO = [
  { value: "PENDIENTE", label: "Pendiente", tone: "warning" },
  { value: "EN_PROCESO", label: "En proceso", tone: "primary" },
  { value: "LISTO", label: "Listo", tone: "success" },
  { value: "ENTREGADO", label: "Entregado", tone: "neutral" },
  { value: "CANCELADO", label: "Cancelado", tone: "danger" },
] as const;

export type Tone = (typeof ESTADOS_PEDIDO)[number]["tone"];

export const ESTADOS_POR_DEFECTO = ["PENDIENTE", "EN_PROCESO", "LISTO"];

export function estadoInfo(estado: string): { label: string; tone: Tone } {
  const found = ESTADOS_PEDIDO.find((e) => e.value === estado);
  return found ?? { label: estado, tone: "neutral" };
}

export function resolveEstados(valor: string | null): string[] {
  if (valor === "TODOS") return ESTADOS_PEDIDO.map((estado) => estado.value);
  if (valor === "NONE") return [];
  if (valor === null) return ESTADOS_POR_DEFECTO;
  const estados = valor
    .split(",")
    .filter((estado) => ESTADOS_PEDIDO.some((opcion) => opcion.value === estado));
  return estados.length > 0 ? estados : ESTADOS_POR_DEFECTO;
}
