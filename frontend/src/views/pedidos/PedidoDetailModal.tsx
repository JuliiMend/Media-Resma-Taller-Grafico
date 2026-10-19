import { useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api, getErrorMessage } from "@/api/client";
import { Badge, Button, ConfirmDialog, ErrorBanner, Field, Input, Modal, Select } from "@/components/ui";
import { cn, formatDate, formatMoney, toNumber } from "@/lib/format";
import type { Cliente, Pedido, Producto, Trabajo } from "@/types";
import { ESTADOS_PEDIDO } from "./estados";
import { TrabajoFormModal } from "./TrabajoFormModal";

export function PedidoDetailModal({
  pedido,
  cliente,
  productos,
  onClose,
  onChanged,
  onDelete,
  onEdit,
}: {
  pedido: Pedido | null;
  cliente?: Cliente;
  productos: Producto[];
  onClose: () => void;
  onChanged: () => void | Promise<void>;
  onDelete: (pedido: Pedido) => void;
  onEdit: (pedido: Pedido) => void;
}) {
  const [savingEstado, setSavingEstado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmCobro, setConfirmCobro] = useState(false);
  const [confirmPagar, setConfirmPagar] = useState(false);
  const [pagoOpen, setPagoOpen] = useState(false);
  const [pagoMonto, setPagoMonto] = useState("");
  const [pagoSaving, setPagoSaving] = useState(false);
  const [pagoError, setPagoError] = useState<string | null>(null);
  const [trabajoOpen, setTrabajoOpen] = useState(false);
  const [trabajoEdit, setTrabajoEdit] = useState<Trabajo | null>(null);
  const [toDeleteTrabajo, setToDeleteTrabajo] = useState<Trabajo | null>(null);
  const [borrandoTrabajo, setBorrandoTrabajo] = useState(false);

  if (!pedido) return null;

  const trabajos = pedido.trabajos ?? [];
  const total = toNumber(pedido.total);
  const sena = toNumber(pedido.sena);
  const resta = toNumber(pedido.restaPagar);
  const costoTotal = toNumber(pedido.costoTotal);
  const ganancia = toNumber(pedido.ganancia);
  const saldado = resta <= 0;
  const nombreCliente = pedido.cliente?.nombre ?? cliente?.nombre ?? `#${pedido.clienteId}`;

  async function guardarEstado(estado: string, cobrar: boolean) {
    if (!pedido) return;
    setSavingEstado(true);
    setError(null);
    try {
      await api.patch(`/pedidos/${pedido.id}`, { estado });
      if (cobrar) await api.post(`/pedidos/${pedido.id}/pagos`);
      await onChanged();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingEstado(false);
    }
  }

  function changeEstado(nuevo: string) {
    if (!pedido || nuevo === pedido.estado) return;
    if (nuevo === "ENTREGADO" && !saldado) {
      setConfirmCobro(true);
      return;
    }
    void guardarEstado(nuevo, false);
  }

  function confirmarCobro(cobrar: boolean) {
    setConfirmCobro(false);
    void guardarEstado("ENTREGADO", cobrar);
  }

  async function marcarComoPagado() {
    if (!pedido) return;
    setConfirmPagar(false);
    setSavingEstado(true);
    setError(null);
    try {
      await api.post(`/pedidos/${pedido.id}/pagos`);
      await onChanged();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingEstado(false);
    }
  }

  function abrirPago() {
    setPagoMonto("");
    setPagoError(null);
    setPagoOpen(true);
  }

  async function submitPago(e: FormEvent) {
    e.preventDefault();
    if (!pedido) return;
    const monto = toNumber(pagoMonto);
    if (monto <= 0) return setPagoError("Ingresá un monto mayor a 0");
    setPagoSaving(true);
    setPagoError(null);
    try {
      await api.post(`/pedidos/${pedido.id}/pagos`, { monto });
      setPagoOpen(false);
      await onChanged();
    } catch (err) {
      setPagoError(getErrorMessage(err));
    } finally {
      setPagoSaving(false);
    }
  }

  function editarTrabajo(trabajo: Trabajo) {
    setTrabajoEdit(trabajo);
    setTrabajoOpen(true);
  }

  function agregarTrabajo() {
    setTrabajoEdit(null);
    setTrabajoOpen(true);
  }

  async function quitarTrabajo() {
    if (!toDeleteTrabajo?.id) return;
    setBorrandoTrabajo(true);
    setError(null);
    try {
      await api.delete(`/trabajos/${toDeleteTrabajo.id}`);
      setToDeleteTrabajo(null);
      await onChanged();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBorrandoTrabajo(false);
    }
  }

  const info: [string, string][] = [
    ["Cliente", nombreCliente],
    ["Fecha", formatDate(pedido.fecha)],
    ["Entrega", formatDate(pedido.fechaEntrega)],
    ["Medio de pago", pedido.medioPago || "—"],
    ["Envío", formatMoney(pedido.envio)],
  ];

  return (
    <Modal open onClose={onClose} title={`Pedido #${pedido.id}`} size="lg">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
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
          <Button variant="secondary" onClick={() => onEdit(pedido)}>
            <Pencil className="size-4" aria-hidden="true" />
            Editar
          </Button>
        </div>

        {error && <ErrorBanner message={error} />}

        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-5">
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

        <section aria-labelledby="cobros-title" className="rounded-xl border border-line bg-background/50 p-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h3 id="cobros-title" className="mb-3 text-sm font-semibold">
                Cobros
              </h3>
              <dl className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <dt className="text-xs text-muted">Total</dt>
                  <dd className="font-semibold tabular-nums">{formatMoney(total)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Seña</dt>
                  <dd className="font-semibold tabular-nums text-success">{formatMoney(sena)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Resta</dt>
                  <dd className={cn("font-semibold tabular-nums", saldado ? "text-success" : "text-primary")}>{formatMoney(resta)}</dd>
                </div>
              </dl>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {saldado ? (
                <Badge tone="success">Saldado</Badge>
              ) : (
                <>
                  <Button variant="secondary" size="sm" disabled={savingEstado} onClick={abrirPago}>
                    Registrar pago
                  </Button>
                  <Button size="sm" disabled={savingEstado} onClick={() => setConfirmPagar(true)}>
                    Marcar como pagado
                  </Button>
                </>
              )}
            </div>
          </div>
        </section>

        <section aria-labelledby="trabajos-title">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 id="trabajos-title" className="text-sm font-semibold">
              Trabajos
            </h3>
            <Button variant="secondary" size="sm" onClick={agregarTrabajo}>
              <Plus className="size-4" aria-hidden="true" />
              Agregar trabajo
            </Button>
          </div>

          {trabajos.length === 0 ? (
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
                    <th scope="col" className="px-3 py-2 text-right font-medium">Costo unit.</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Ganancia</th>
                    <th scope="col" className="px-3 py-2"><span className="sr-only">Acciones</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {trabajos.map((t) => {
                    const cantidad = toNumber(t.cantidad);
                    const subtotal = cantidad * toNumber(t.valorUnitario);
                    const tieneCosto = t.costoUnitario !== null && t.costoUnitario !== undefined;
                    const gananciaLinea = subtotal - cantidad * toNumber(t.costoUnitario);
                    return (
                      <tr key={t.id}>
                        <td className="px-3 py-2">{t.descripcion}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{cantidad}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatMoney(t.valorUnitario)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatMoney(subtotal)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{tieneCosto ? formatMoney(t.costoUnitario) : "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatMoney(gananciaLinea)}</td>
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Editar trabajo ${t.descripcion}`}
                              onClick={() => editarTrabajo(t)}
                            >
                              <Pencil className="size-4" aria-hidden="true" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Quitar trabajo ${t.descripcion}`}
                              className="text-danger hover:bg-danger-soft"
                              onClick={() => setToDeleteTrabajo(t)}
                            >
                              <Trash2 className="size-4" aria-hidden="true" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <dl className="mt-3 grid grid-cols-3 gap-4 rounded-lg bg-background p-4 text-sm">
            <div>
              <dt className="text-xs text-muted">Total</dt>
              <dd className="font-semibold tabular-nums">{formatMoney(total)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Costo total</dt>
              <dd className="font-semibold tabular-nums">{formatMoney(costoTotal)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Ganancia</dt>
              <dd className="font-semibold tabular-nums text-success">{formatMoney(ganancia)}</dd>
            </div>
          </dl>
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

      <Modal open={pagoOpen} onClose={() => setPagoOpen(false)} title="Registrar pago">
        <form onSubmit={submitPago} className="flex flex-col gap-4">
          <Field label={`Monto (saldo ${formatMoney(resta)})`} htmlFor="pago-monto">
            <Input
              id="pago-monto"
              type="number"
              min={0}
              step="0.01"
              autoFocus
              value={pagoMonto}
              onChange={(e) => setPagoMonto(e.target.value)}
              placeholder="0,00"
            />
          </Field>
          {pagoError && <ErrorBanner message={pagoError} />}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setPagoOpen(false)} disabled={pagoSaving}>
              Cancelar
            </Button>
            <Button type="submit" loading={pagoSaving}>
              Registrar pago
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmCobro}
        title="Pedido entregado con saldo"
        message={`¿Cobraste el saldo de ${formatMoney(resta)}?`}
        confirmLabel="Sí, cobré el saldo"
        cancelLabel="No, sigue pendiente"
        confirmVariant="primary"
        onConfirm={() => confirmarCobro(true)}
        onCancel={() => confirmarCobro(false)}
        loading={savingEstado}
      />

      <ConfirmDialog
        open={confirmPagar}
        title="Marcar como pagado"
        message={`Se registra un pago de ${formatMoney(resta)} y el pedido queda saldado.`}
        confirmLabel="Sí, marcar como pagado"
        confirmVariant="primary"
        onConfirm={() => void marcarComoPagado()}
        onCancel={() => setConfirmPagar(false)}
        loading={savingEstado}
      />

      <ConfirmDialog
        open={toDeleteTrabajo !== null}
        title="Quitar trabajo"
        message={`Se quita "${toDeleteTrabajo?.descripcion ?? ""}" del pedido. Esta acción no se puede deshacer.`}
        onConfirm={quitarTrabajo}
        onCancel={() => setToDeleteTrabajo(null)}
        loading={borrandoTrabajo}
      />

      <TrabajoFormModal
        open={trabajoOpen}
        onClose={() => setTrabajoOpen(false)}
        onSaved={async () => {
          setTrabajoOpen(false);
          await onChanged();
        }}
        pedidoId={pedido.id}
        trabajo={trabajoEdit}
        productos={productos}
      />
    </Modal>
  );
}
