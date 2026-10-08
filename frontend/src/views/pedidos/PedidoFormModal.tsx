import { useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { api, getErrorMessage } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { Button, ErrorBanner, Field, Input, Modal, Select, Textarea } from "@/components/ui";
import { formatMoney, toNumber } from "@/lib/format";
import type { Cliente, Pedido, Producto } from "@/types";
import { ESTADOS_PEDIDO } from "./estados";

interface Linea {
  key: number;
  productoId: string;
  descripcion: string;
  cantidad: string;
  valorUnitario: string;
}

let lineaKey = 0;
const nuevaLinea = (): Linea => ({ key: ++lineaKey, productoId: "", descripcion: "", cantidad: "1", valorUnitario: "" });

export function PedidoFormModal({
  open,
  onClose,
  onCreated,
  clientes,
  productos,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  clientes: Cliente[];
  productos: Producto[];
}) {
  const { user } = useAuth();
  const [clienteId, setClienteId] = useState("");
  const [estado, setEstado] = useState("PENDIENTE");
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [sena, setSena] = useState("");
  const [envio, setEnvio] = useState("");
  const [medioPago, setMedioPago] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [lineas, setLineas] = useState<Linea[]>(() => [nuevaLinea()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const productosActivos = productos.filter((p) => p.activo);
  const subtotal = lineas.reduce((s, l) => s + toNumber(l.cantidad) * toNumber(l.valorUnitario), 0);
  const total = subtotal + toNumber(envio);
  const resta = Math.max(0, total - toNumber(sena));

  function reset() {
    setClienteId("");
    setEstado("PENDIENTE");
    setFechaEntrega("");
    setSena("");
    setEnvio("");
    setMedioPago("");
    setObservaciones("");
    setLineas([nuevaLinea()]);
    setError(null);
  }

  function updateLinea(key: number, patch: Partial<Linea>) {
    setLineas((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function selectProducto(key: number, productoId: string) {
    const producto = productos.find((p) => String(p.id) === productoId);
    updateLinea(key, {
      productoId,
      ...(producto && { descripcion: producto.nombre, valorUnitario: String(toNumber(producto.precioVenta)) }),
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const lineasValidas = lineas.filter((l) => l.descripcion.trim());
    if (!clienteId) return setError("Elegí un cliente");
    if (lineasValidas.some((l) => toNumber(l.cantidad) <= 0)) return setError("La cantidad de cada trabajo debe ser mayor a 0");
    if (lineasValidas.some((l) => l.valorUnitario === "")) return setError("Completá el valor unitario de cada trabajo");

    setSaving(true);
    setError(null);
    try {
      const { data: pedido } = await api.post<Pedido>("/pedidos", {
        clienteId: Number(clienteId),
        usuarioId: user?.id ?? null,
        estado,
        fechaEntrega: fechaEntrega ? new Date(`${fechaEntrega}T00:00:00.000Z`).toISOString() : undefined,
        sena: sena ? toNumber(sena) : 0,
        envio: envio ? toNumber(envio) : null,
        restaPagar: resta,
        medioPago: medioPago.trim() || undefined,
        observaciones: observaciones.trim() || undefined,
      });
      for (const l of lineasValidas) {
        await api.post("/trabajos", {
          pedidoId: pedido.id,
          productoId: l.productoId ? Number(l.productoId) : null,
          descripcion: l.descripcion.trim(),
          cantidad: toNumber(l.cantidad),
          valorUnitario: toNumber(l.valorUnitario),
        });
      }
      reset();
      onCreated();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuevo pedido" size="lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Cliente *" htmlFor="p-cliente">
            <Select id="p-cliente" required value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              <option value="">Elegí un cliente…</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Estado" htmlFor="p-estado">
            <Select id="p-estado" value={estado} onChange={(e) => setEstado(e.target.value)}>
              {ESTADOS_PEDIDO.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Fecha de entrega" htmlFor="p-entrega">
            <Input id="p-entrega" type="date" value={fechaEntrega} onChange={(e) => setFechaEntrega(e.target.value)} />
          </Field>
          <Field label="Medio de pago" htmlFor="p-medio">
            <Input id="p-medio" value={medioPago} onChange={(e) => setMedioPago(e.target.value)} placeholder="Efectivo, transferencia…" />
          </Field>
        </div>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 text-sm font-semibold">Trabajos</legend>
          {lineas.map((l, idx) => (
            <div key={l.key} className="grid gap-3 rounded-lg border border-line bg-background/50 p-3 sm:grid-cols-12 sm:items-end">
              <div className="sm:col-span-4">
                <Field label="Producto" htmlFor={`l-prod-${l.key}`}>
                  <Select id={`l-prod-${l.key}`} value={l.productoId} onChange={(e) => selectProducto(l.key, e.target.value)}>
                    <option value="">Personalizado</option>
                    {productosActivos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="sm:col-span-4">
                <Field label="Descripción" htmlFor={`l-desc-${l.key}`}>
                  <Input id={`l-desc-${l.key}`} value={l.descripcion} onChange={(e) => updateLinea(l.key, { descripcion: e.target.value })} />
                </Field>
              </div>
              <div className="sm:col-span-1">
                <Field label="Cant." htmlFor={`l-cant-${l.key}`}>
                  <Input id={`l-cant-${l.key}`} type="number" min={0} step="1" value={l.cantidad} onChange={(e) => updateLinea(l.key, { cantidad: e.target.value })} />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Valor unit." htmlFor={`l-val-${l.key}`}>
                  <Input id={`l-val-${l.key}`} type="number" min={0} step="0.01" value={l.valorUnitario} onChange={(e) => updateLinea(l.key, { valorUnitario: e.target.value })} />
                </Field>
              </div>
              <div className="flex justify-end sm:col-span-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setLineas((ls) => (ls.length > 1 ? ls.filter((x) => x.key !== l.key) : [nuevaLinea()]))}
                  aria-label={`Quitar trabajo ${idx + 1}`}
                  className="text-danger hover:bg-danger-soft"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          ))}
          <Button type="button" variant="secondary" size="sm" className="self-start" onClick={() => setLineas((ls) => [...ls, nuevaLinea()])}>
            <Plus className="size-4" aria-hidden="true" />
            Agregar trabajo
          </Button>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Seña" htmlFor="p-sena">
            <Input id="p-sena" type="number" min={0} step="0.01" value={sena} onChange={(e) => setSena(e.target.value)} />
          </Field>
          <Field label="Envío" htmlFor="p-envio">
            <Input id="p-envio" type="number" min={0} step="0.01" value={envio} onChange={(e) => setEnvio(e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Observaciones" htmlFor="p-obs">
              <Textarea id="p-obs" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
            </Field>
          </div>
        </div>

        <dl className="grid grid-cols-3 gap-4 rounded-lg bg-background p-4 text-sm">
          <div>
            <dt className="text-xs text-muted">Total</dt>
            <dd className="font-semibold tabular-nums">{formatMoney(total)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Seña</dt>
            <dd className="font-semibold tabular-nums">{formatMoney(sena)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Resta pagar</dt>
            <dd className="font-semibold tabular-nums text-primary">{formatMoney(resta)}</dd>
          </div>
        </dl>

        {error && <ErrorBanner message={error} />}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            Crear pedido
          </Button>
        </div>
      </form>
    </Modal>
  );
}
