import { useState } from "react";
import useSWR from "swr";
import { Trash2 } from "lucide-react";
import { api, fetcher, getErrorMessage } from "@/api/client";
import { Button, ErrorBanner, Field, LoadingState, Modal, Select } from "@/components/ui";
import { formatDate, formatMoney, toNumber } from "@/lib/format";
import type { Cliente, Pedido, Trabajo } from "@/types";
import { ESTADOS_PEDIDO } from "./estados";

export function PedidoDetailModal({
  pedido,
  cliente,
  onClose,
  onChanged,
  onDelete,
}: {
  pedido: Pedido | null;
  cliente?: Cliente;
  onClose: () => void;
  onChanged: () => void;
  onDelete: (pedido: Pedido) => void;
}) {
  const { data: trabajos, isLoading } = useSWR<Trabajo[]>(pedido ? "/trabajos" : null, fetcher);
  const [savingEstado, setSavingEstado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!pedido) return null;

  const propios = (trabajos ?? []).filter((t) => t.pedidoId === pedido.id);
  const subtotal = propios.reduce((s, t) => s + toNumber(t.cantidad) * toNumber(t.valorUnitario), 0);

  async function changeEstado(estado: string) {
    if (!pedido) return;
    setSavingEstado(true);
    setError(null);
    try {
      await api.patch(`/pedidos/${pedido.id}`, { estado });
      onChanged();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingEstado(false);
    }
  }

  const info: [string, string][] = [
    ["Cliente", cliente?.nombre ?? `#${pedido.clienteId}`],
    ["Fecha", formatDate(pedido.fecha)],
    ["Entrega", formatDate(pedido.fechaEntrega)],
    ["Medio de pago", pedido.medioPago || "—"],
    ["Seña", formatMoney(pedido.sena)],
    ["Envío", formatMoney(pedido.envio)],
    ["Resta pagar", formatMoney(pedido.restaPagar)],
  ];

  return (
    <Modal open onClose={onClose} title={`Pedido #${pedido.id}`} size="lg">
      <div className="flex flex-col gap-6">
        <div className="max-w-xs">
          <Field label="Estado" htmlFor="detail-estado">
            <Select id="detail-estado" value={pedido.estado} disabled={savingEstado} onChange={(e) => changeEstado(e.target.value)}>
              {ESTADOS_PEDIDO.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {error && <ErrorBanner message={error} />}

        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          {info.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="font-medium tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>

        {pedido.observaciones && (
          <div>
            <h3 className="text-xs text-muted">Observaciones</h3>
            <p className="mt-1 text-sm text-pretty">{pedido.observaciones}</p>
          </div>
        )}

        <section aria-labelledby="trabajos-title">
          <h3 id="trabajos-title" className="mb-3 text-sm font-semibold">
            Trabajos
          </h3>
          {isLoading ? (
            <LoadingState label="Cargando trabajos…" />
          ) : propios.length === 0 ? (
            <p className="text-sm text-muted">Este pedido no tiene trabajos cargados.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-line">
              <table className="w-full text-sm">
                <thead className="bg-background/60 text-left text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-medium">Descripción</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Cant.</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Unitario</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {propios.map((t) => (
                    <tr key={t.id}>
                      <td className="px-3 py-2">{t.descripcion}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{toNumber(t.cantidad)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatMoney(t.valorUnitario)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatMoney(toNumber(t.cantidad) * toNumber(t.valorUnitario))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-line font-semibold">
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-right">Total trabajos</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatMoney(subtotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>

        <div className="flex justify-between gap-2 border-t border-line pt-4">
          <Button variant="ghost" className="text-danger hover:bg-danger-soft" onClick={() => onDelete(pedido)}>
            <Trash2 className="size-4" aria-hidden="true" />
            Eliminar pedido
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
