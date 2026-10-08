export const ESTADOS_PEDIDO = [
  { value: "PENDIENTE", label: "Pendiente", tone: "warning" },
  { value: "EN_PROCESO", label: "En proceso", tone: "primary" },
  { value: "LISTO", label: "Listo", tone: "success" },
  { value: "ENTREGADO", label: "Entregado", tone: "neutral" },
  { value: "CANCELADO", label: "Cancelado", tone: "danger" },
] as const;

export type Tone = (typeof ESTADOS_PEDIDO)[number]["tone"];

export function estadoInfo(estado: string): { label: string; tone: Tone } {
  const found = ESTADOS_PEDIDO.find((e) => e.value === estado);
  return found ?? { label: estado, tone: "neutral" };
}
